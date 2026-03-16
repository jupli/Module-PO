'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// Helper function to parse Indonesian date string like "SENIN, 12 JANUARI 2026"
function parseIndonesianDate(dateStr: string): Date {
  try {
    // Remove day name (SENIN, )
    const parts = dateStr.split(',')
    if (parts.length < 2) return new Date()
    
    const datePart = parts[1].trim() // "12 JANUARI 2026"
    const [day, monthName, year] = datePart.split(' ')
    
    const months: {[key: string]: number} = {
      'JANUARI': 0, 'FEBRUARI': 1, 'MARET': 2, 'APRIL': 3, 'MEI': 4, 'JUNI': 5,
      'JULI': 6, 'AGUSTUS': 7, 'SEPTEMBER': 8, 'OKTOBER': 9, 'NOVEMBER': 10, 'DESEMBER': 11
    }
    
    const month = months[monthName.toUpperCase()]
    if (month === undefined) return new Date()
    
    return new Date(parseInt(year), month, parseInt(day))
  } catch (e) {
    console.error('Date parsing error:', e)
    return new Date()
  }
}

export async function uploadRequestExcel(formData: FormData) {
  console.log('Starting uploadRequestExcel...')
  try {
    const file = formData.get('file') as File
    if (!file) {
      console.log('No file uploaded')
      return { success: false, message: 'No file uploaded' }
    }
    console.log(`File received: ${file.name}, size: ${file.size} bytes`)

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    let processedData = []
    let currentDay = null
    let currentDateStr = null
    let currentMenu = null
    let currentPortion = null // 'Large' | 'Small' | null
    let requestDate = new Date() // Default today

    // Loop data
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i]
        if (!row || row.length === 0) continue

        // Deteksi Tanggal
        const firstCell = row[0]
        if (typeof firstCell === 'string' && (firstCell.includes('SENIN') || firstCell.includes('SELASA') || firstCell.includes('RABU') || firstCell.includes('KAMIS') || firstCell.includes('JUMAT') || firstCell.includes('SABTU') || firstCell.includes('MINGGU'))) {
            currentDateStr = firstCell.trim()
            requestDate = parseIndonesianDate(currentDateStr)
            currentPortion = null // Reset portion on new date
            continue
        }

        // Deteksi Porsi
        // Normalize: remove all spaces and special chars, uppercase
        const cleanRow = row.map(cell => String(cell || '')).join('').toUpperCase().replace(/[^A-Z0-9]/g, '')
        
        if (cleanRow.includes('PORSIBESAR')) {
            console.log(`Found PORSI BESAR at row ${i}`)
            currentPortion = 'Large'
        } else if (cleanRow.includes('PORSIKECIL')) {
            console.log(`Found PORSI KECIL at row ${i}`)
            currentPortion = 'Small'
        }

        // Debug log to file for troubleshooting
        try {
          const logPath = path.join(process.cwd(), 'upload-debug.log')
          const logMsg = `Row ${i}: ${JSON.stringify(row)} -> Clean: ${cleanRow} -> Portion: ${currentPortion}\n`
          fs.appendFileSync(logPath, logMsg)
        } catch (e) {
          // ignore logging errors
        }

        // Skip header rows
        if (row[1] === 'MENU' || row[2] === 'BAHAN MAKANAN') continue

        // Map columns (adjust index based on Excel structure)
        // A=0, B=1, C=2 ... H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14
        const hariKe = row[0]
        const menu = row[1]
        let bahanMakanan = row[2]
        
        // Extract Quantities from Breakdown Columns
        // TOTAL BESAR PORSI (gram) -> Col I (index 8)
        // TOTAL PORSI KECIL (gram) -> Col J (index 9)
        // BUFFER -> Col L (index 11)
        
        const qtyLargeRaw = row[8]  // TOTAL BESAR PORSI (gram)
        const qtySmallRaw = row[9]  // TOTAL PORSI KECIL (gram)
        const qtyBufferRaw = row[11] // BUFFER
        const totalTargetKgRaw = row[12] // TOTAL KEBUTUHAN Kg

        const satuan = row[13] // Kolom N (SATUAN)
        const catatan = row[14] // Kolom O

        if (!bahanMakanan) continue
        
        // Clean up strings
        bahanMakanan = String(bahanMakanan).trim()

        if (hariKe) currentDay = hariKe
        if (menu) currentMenu = menu

        // Helper to parse number
        const parseNum = (val: any) => {
            if (typeof val === 'number') return val
            if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0
            return 0
        }

        const qtyLarge = parseNum(qtyLargeRaw)
        const qtySmall = parseNum(qtySmallRaw)
        const qtyBuffer = parseNum(qtyBufferRaw)
        const totalTargetKg = parseNum(totalTargetKgRaw)
        
        const unitRaw = satuan ? String(satuan).trim().toLowerCase() : 'pcs'
        const unit = unitRaw // Keep original unit for display
        
        let finalQtyLarge = qtyLarge
        let finalQtySmall = qtySmall
        let finalQtyBuffer = qtyBuffer
        
        const isWeightUnit = ['kg', 'liter', 'l', 'ltr'].includes(unitRaw)

        // STRATEGI BARU: Prioritaskan "TOTAL KEBUTUHAN Kg" (Kolom M) sebagai kebenaran mutlak.
        // Gunakan komponen lain (Large, Small, Buffer) HANYA untuk proporsi pembagian.
        
        // 1. Hitung potensi total jika diasumsikan input adalah Gram (untuk Large/Small) + Buffer (as-is/Kg)
        //    Ini adalah standar untuk item Kg/Liter.
        const standardTotal = (qtyLarge / 1000) + (qtySmall / 1000) + qtyBuffer
        
        // 2. Hitung potensi total jika diasumsikan input adalah Unit/Pcs (semua dijumlah mentah)
        //    Ini untuk item Pcs, atau item Kg yang inputnya ternyata Pcs (seperti Telur).
        const rawTotal = qtyLarge + qtySmall + qtyBuffer

        // 3. Tentukan Target Total yang akan dipakai
        let targetTotal = 0
        
        if (totalTargetKg > 0) {
            targetTotal = totalTargetKg
        } else {
            // Jika tidak ada target (kosong), gunakan standard calculation jika unit berat, atau raw jika unit pcs
            targetTotal = isWeightUnit ? standardTotal : rawTotal
        }

        // 4. Tentukan Proporsi Distribusi
        //    Kita perlu tahu apakah input komponen itu dalam Gram atau dalam Unit yang sama dengan Target.
        //    Cek mana yang lebih masuk akal dengan Target.
        
        let useStandardDistribution = false
        
        if (totalTargetKg > 0 && isWeightUnit) {
             // Cek selisih dengan Standard Calculation
             const diffStandard = Math.abs(standardTotal - totalTargetKg)
             // Toleransi: 5% atau 0.5kg
             const tolerance = Math.max(0.5, totalTargetKg * 0.05)
             
             if (diffStandard <= tolerance) {
                 useStandardDistribution = true
             } else {
                 // Jika Standard Calc jauh meleset (seperti Telur: 45kg vs 3.4kg, atau 5kg vs 3.4kg),
                 // Maka kemungkinan besar inputnya BUKAN Gram, tapi Unit/Pcs.
                 // Jadi kita pakai Raw Distribution.
                 useStandardDistribution = false
                 console.log(`[${bahanMakanan}] Standard Calc (${standardTotal}) differs from Target (${totalTargetKg}). Using Raw Distribution.`)
             }
        } else if (isWeightUnit) {
             // Jika tidak ada target, default ke Standard untuk unit berat
             useStandardDistribution = true
        } else {
             // Unit non-berat (Pcs, Bks, dll) -> Selalu Raw Distribution
             useStandardDistribution = false
        }

        // 5. Hitung Final Quantity berdasarkan Proporsi
        if (useStandardDistribution) {
             // Proporsi berbasis Gram->Kg
             // Total Pembagi = StandardTotal (atau mendekati Target)
             // Kita pakai TargetTotal sebagai total akhir, dan membaginya sesuai porsi Standard.
             // Hindari pembagian dengan nol.
             const divider = standardTotal > 0 ? standardTotal : 1
             
             finalQtyLarge = ((qtyLarge / 1000) / divider) * targetTotal
             finalQtySmall = ((qtySmall / 1000) / divider) * targetTotal
             finalQtyBuffer = (qtyBuffer / divider) * targetTotal
        } else {
             // Proporsi berbasis Raw Unit
             const divider = rawTotal > 0 ? rawTotal : 1
             
             finalQtyLarge = (qtyLarge / divider) * targetTotal
             finalQtySmall = (qtySmall / divider) * targetTotal
             finalQtyBuffer = (qtyBuffer / divider) * targetTotal
        }

        // Debug Log
        // console.log(`Item: ${bahanMakanan}, Target: ${targetTotal}, Dist: ${useStandardDistribution ? 'Std' : 'Raw'}, Large: ${finalQtyLarge}`)


        // Push 3 separate items if they exist
        
        // Auto-Categorization Logic
        let category = 'Lain-lain'
        const itemLower = bahanMakanan.toLowerCase()
        const menuLower = currentMenu ? currentMenu.toLowerCase() : ''
        
        const isBahanBasah = 
            // Fruits
            itemLower.includes('jeruk') || itemLower.includes('apel') || itemLower.includes('pisang') || 
            itemLower.includes('pepaya') || itemLower.includes('semangka') || itemLower.includes('melon') || 
            itemLower.includes('mangga') || itemLower.includes('pir') || itemLower.includes('anggur') || 
            itemLower.includes('buah') ||
            // Vegetables
            itemLower.includes('bayam') || itemLower.includes('kangkung') || itemLower.includes('sawi') || 
            itemLower.includes('pakcoy') || itemLower.includes('kubis') || itemLower.includes('kol') || 
            itemLower.includes('wortel') || itemLower.includes('kentang') || itemLower.includes('tomat') || 
            itemLower.includes('timun') || itemLower.includes('terong') || itemLower.includes('buncis') || 
            itemLower.includes('cabe') || itemLower.includes('cabai') || itemLower.includes('bawang') ||
            itemLower.includes('seledri') || itemLower.includes('sledri') || itemLower.includes('daun sop') ||
            // Proteins
            itemLower.includes('ayam') || itemLower.includes('daging') || itemLower.includes('sapi') || 
            itemLower.includes('ikan') || itemLower.includes('lele') || itemLower.includes('udang') || 
            itemLower.includes('cumi') || itemLower.includes('telur') || itemLower.includes('tahu') || 
            itemLower.includes('tempe') || itemLower.includes('bakso') || itemLower.includes('sosis') ||
            // Dairy
            itemLower.includes('susu') || itemLower.includes('keju') || itemLower.includes('mentega') || 
            itemLower.includes('yogurt') ||
            // Bakery & Others
            itemLower.includes('roti') || itemLower.includes('kue') || itemLower.includes('bakpau') || 
            itemLower.includes('bakpia')

        const isBahanKering = 
            itemLower.includes('beras') || itemLower.includes('tepung') || itemLower.includes('gula') || 
            itemLower.includes('minyak') || itemLower.includes('bumbu') || itemLower.includes('garam') || 
            itemLower.includes('kecap') || itemLower.includes('saus') || itemLower.includes('teh') || 
            itemLower.includes('kopi') || itemLower.includes('kerupuk') || itemLower.includes('mie') || 
            itemLower.includes('bihun') || itemLower.includes('soun') || itemLower.includes('makaroni') ||
            itemLower.includes('agar') || itemLower.includes('jelly') || itemLower.includes('coklat') ||
            itemLower.includes('sirup') || itemLower.includes('air')

        if (isBahanBasah) {
            category = 'Bahan Basah'
        } else if (isBahanKering) {
            category = 'Bahan Kering'
        } else if (currentMenu) {
            // Fallback based on menu
            if (menuLower.includes('sayur') || menuLower.includes('buah') || menuLower.includes('lauk')) {
                category = 'Bahan Basah'
            } else if (menuLower.includes('goreng') || menuLower.includes('snack')) {
                category = 'Bahan Kering'
            }
        }

        const notes = catatan ? String(catatan).trim() : '-'

        // Add Large Portion
        if (finalQtyLarge > 0) {
            processedData.push({
                itemName: bahanMakanan,
                category,
                portion: 'Large',
                quantity: finalQtyLarge,
                unit,
                notes
            })
        }

        // Add Small Portion
        if (finalQtySmall > 0) {
            processedData.push({
                itemName: bahanMakanan,
                category,
                portion: 'Small',
                quantity: finalQtySmall,
                unit,
                notes
            })
        }

        // Add Buffer Portion
        if (finalQtyBuffer > 0) {
            processedData.push({
                itemName: bahanMakanan,
                category,
                portion: 'Buffer', // Will show as 'Buffer (Sisa)' in UI if logic matches
                quantity: finalQtyBuffer,
                unit,
                notes
            })
        }
    }

    console.log(`Processed ${processedData.length} valid items from Excel`)

    if (processedData.length === 0) {
        console.log('No valid data found')
        return { success: false, message: 'No valid data found in Excel' }
    }

    // Save to Database
    console.log('Saving to database...')
    
    // Generate IDs
    const requestId = randomUUID()
    const now = new Date()

    // CHECK FOR EXISTING REQUEST ON THIS DATE
    // Format date to YYYY-MM-DD for comparison, or use start/end of day
    // requestDate is a Date object.
    
    // Convert requestDate to UTC strings or similar for precise query if needed, 
    // but Prisma's DateTime should handle it. 
    // Let's find any request with the same date (ignoring time if possible, or assume 00:00:00)
    
    const startOfDay = new Date(requestDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(requestDate)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`Checking for existing requests between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`)

    const existingRequests = await prisma.purchaseRequest.findMany({
      where: {
        requestDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: { id: true }
    })

    if (existingRequests.length > 0) {
      console.log(`Found ${existingRequests.length} existing requests for this date. Deleting...`)
      const idsToDelete = existingRequests.map(r => r.id)
      
      // Delete items first (though Cascade should handle it, explicit is safer)
      await prisma.purchaseRequestItem.deleteMany({
        where: { purchaseRequestId: { in: idsToDelete } }
      })
      
      // Delete requests
      await prisma.purchaseRequest.deleteMany({
        where: { id: { in: idsToDelete } }
      })
      console.log('Deleted existing requests.')
    }

    // Insert Request using Raw SQL to bypass stale Prisma Client
    await prisma.$executeRaw`
      INSERT INTO \`PurchaseRequest\` (\`id\`, \`requestDate\`, \`status\`, \`notes\`, \`createdAt\`, \`updatedAt\`)
      VALUES (${requestId}, ${requestDate}, 'PENDING', ${`Imported from ${file.name} (${currentDateStr || 'No Date'})`}, ${now}, ${now})
    `

    // Insert Items
    for (const item of processedData) {
      const itemId = randomUUID()
      await prisma.$executeRaw`
        INSERT INTO \`PurchaseRequestItem\` (\`id\`, \`purchaseRequestId\`, \`itemName\`, \`category\`, \`portion\`, \`quantity\`, \`unit\`, \`price\`, \`notes\`, \`status\`)
        VALUES (${itemId}, ${requestId}, ${item.itemName}, ${item.category}, ${item.portion}, ${item.quantity}, ${item.unit}, 0, ${item.notes}, 'PENDING')
      `
    }

    revalidatePath('/purchasing/request')
    return { success: true, message: `Successfully imported ${processedData.length} items`, requestId: requestId }

  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, message: 'Failed to process file: ' + (error as Error).message }
  }
}
