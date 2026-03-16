
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

export async function uploadBeneficiaryData(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, message: 'No file uploaded' }
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    // We need to parse the specific structure described by the user.
    // The structure seems to be blocks of data separated by headers/dates.
    
    // Example Pattern:
    // [Date Row] -> "Senin, 12/1/2026"
    // [Category Row] -> "PM PAKET BASAH" (Optional)
    // [Header Row] -> "Penerima Manfaat", "Jumlah Siswa + GTK", "Porsi", ...
    // [Sub Header Row] -> "", "", "kecil", "Besar"
    // [Data Rows] ...
    // [Total Row] -> "JUMLAH SISWA", ...
    // [Empty Row]

    let currentDate: Date | null = null
    let currentCategory: string | null = null
    let processedCount = 0

    // Helper to parse date string "Senin, 12/1/2026"
    const parseDateStr = (str: string): Date | null => {
        try {
            // Remove day name "Senin, "
            const parts = str.split(', ')
            const datePart = parts.length > 1 ? parts[1] : parts[0]
            // Format 12/1/2026 (M/D/YYYY or D/M/YYYY? Usually Indonesia is D/M/YYYY)
            // Let's assume D/M/YYYY based on 12/1 (1st Dec or 12th Jan?)
            // If user input is "12/1/2026", it could be Jan 12 or Dec 1.
            // Given "Senin", we can verify.
            // Jan 12 2026 is Monday. Dec 1 2026 is Tuesday.
            // So "Senin, 12/1/2026" likely means Jan 12, 2026. (D/M/YYYY)
            
            const [day, month, year] = datePart.split('/').map(Number)
            return new Date(year, month - 1, day)
        } catch (e) {
            return null
        }
    }

    // Iterate rows to collect data and dates
    const recordsToInsert: { name: string; total: number; portionSmall: number; portionLarge: number; date: Date; category: string }[] = [];
    const datesToClear = new Set<string>(); // Use ISO date string to track unique dates

    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (!row || row.length === 0) continue

        const firstCell = String(row[0] || '').trim()

        // 1. Check for Date
        // "Senin, 12/1/2026"
        if (firstCell.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),/i)) {
            const parsed = parseDateStr(firstCell)
            if (parsed) {
                currentDate = parsed
                currentCategory = null // Reset category on new date block
                datesToClear.add(currentDate.toISOString()); // Store full ISO string to preserve time component (usually 00:00:00)
                continue
            }
        }

        // 2. Check for Category
        // "PM PAKET BASAH", "PM PAKET KERING", "Penerima Manfaat" (Header)
        if (firstCell.toUpperCase().includes('PM PAKET')) {
            currentCategory = firstCell
            continue
        }

        // Check for Bumil/Busui Header to switch context
        if (firstCell.toUpperCase().includes('BUMIL') || (row[1] && String(row[1]).toUpperCase().includes('BUMIL'))) {
             currentCategory = 'Bumil/Balita'
             continue
        }

        if (firstCell === 'Penerima Manfaat' || row[1] === 'Jumlah Siswa + GTK' || firstCell === 'JUMLAH SISWA' || firstCell === 'JUMLAH PM' || firstCell === 'TOTAL' || firstCell === 'TOTAL PM' || firstCell === 'JUMLAH') {
            continue
        }
        
        // 4. Skip Sub-headers ("kecil", "Besar")
        if (row[2] && String(row[2]).toLowerCase() === 'kecil') {
            continue
        }
        
        // 5. Check for Bumil/Busui special table
    // Header: "Penerima Manfaat", "Porsi"
    // Sub: "Bumil/Busui", "Balita", "Total"
    // This format is slightly different.
    // Let's look at the structure:
    // [Name] [Col1] [Col2] [Col3]
    // REJOSARI 16 20 36
    
    // General Data Row Detection:
    // Name (String) | Total/Num (Int) | Small/Num (Int) | Large/Num (Int)
    // OR
    // Name (String) | Bumil (Int) | Balita (Int) | Total (Int)
    
    // We need to distinguish between the main table and the bumil table.
    // Main table: Name, Total, Small, Large
    // Bumil table: Name, Bumil, Balita, Total
    
        
        // Heuristic: Check if row has numbers
        // Convert to number, but handle potential strings or undefined
        const parseNum = (val: any) => {
            if (typeof val === 'number') return val
            if (typeof val === 'string' && val.trim() !== '') return Number(val)
            return 0
        }

        const col1 = parseNum(row[1])
        const col2 = parseNum(row[2])
        const col3 = parseNum(row[3])

        // A valid data row usually has a name and at least one non-zero number, or represents a record with 0s.
        // But headers also have strings. Headers usually don't parse to valid sum relations easily unless 0=0+0.
        
        // Additional check: First cell should not be empty
        if (firstCell && firstCell.length > 2) {
            
            let name = firstCell
            let total = 0
            let pSmall = 0
            let pLarge = 0
            let cat = currentCategory || 'Uncategorized'
            
            // Check if it's a valid data row (not a header)
            // Headers usually have strings in Col1, Col2...
            if (isNaN(col1) || isNaN(col2) || isNaN(col3)) continue
            
            // Logic to determine row type
            // Default to Main structure if category is not Bumil
            // Main structure: Total (Col1), Small (Col2), Large (Col3)
            // Bumil structure: Bumil (Col1), Balita (Col2), Total (Col3)

            if (cat.includes('Bumil') || cat.includes('Balita')) {
                  // Bumil Logic
                  pSmall = col1 // Bumil
                  pLarge = col2 // Balita
                  total = col3  // Total
            } else {
                  // Main Logic
                  // Verify sum logic to auto-detect if possible
                  // If Col3 = Col1 + Col2 -> Likely Bumil format?
                  // If Col1 = Col2 + Col3 -> Likely Main format?
                  
                  if (col3 > 0 && col3 === col1 + col2) {
                      // Looks like Bumil format (Sum at end)
                      // But wait, Main format is Total | Small | Large.
                      // If Total = Small + Large => Col1 = Col2 + Col3.
                      
                      // If Col3 = Col1 + Col2, that means Col3 is Total.
                      // So likely Bumil format.
                      cat = 'Bumil/Balita' // Auto-switch context if math fits Bumil
                      pSmall = col1
                      pLarge = col2
                      total = col3
                  } else {
                      // Assume Main format
                      total = col1
                      pSmall = col2
                      pLarge = col3
                  }
            }

            if (currentDate) {
                recordsToInsert.push({
                    name,
                    total,
                    portionSmall: pSmall,
                    portionLarge: pLarge,
                    date: currentDate,
                    category: cat
                });
            }
        }
    }

    // Perform database operations
    if (datesToClear.size > 0) {
        console.log('Clearing existing beneficiary data for dates:', Array.from(datesToClear));
        const dates = Array.from(datesToClear).map(d => new Date(d));
        
        // Use deleteMany to remove all records for these dates
        await prisma.beneficiary.deleteMany({
            where: {
                date: {
                    in: dates
                }
            }
        });
    }

    if (recordsToInsert.length > 0) {
        console.log(`Inserting ${recordsToInsert.length} beneficiary records...`);
        // Use createMany for better performance
        await prisma.beneficiary.createMany({
            data: recordsToInsert
        });
        processedCount = recordsToInsert.length;
    }

    revalidatePath('/purchasing/request')
    return { success: true, message: `Berhasil mengimpor ${processedCount} data penerima manfaat.` }

  } catch (error) {
    console.error('Upload beneficiary error:', error)
    return { success: false, message: 'Gagal memproses file excel: ' + (error as Error).message }
  }
}
