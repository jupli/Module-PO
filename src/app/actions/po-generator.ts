'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Generates Purchase Orders automatically from a Purchase Request.
 * Logic:
 * 1. Groups items by category.
 * 2. Finds a supplier for each category (fuzzy match).
 * 3. Creates/Finds Product Master Data for each item.
 * 4. Creates a Purchase Order for each supplier group.
 */
export async function generatePurchaseOrders(requestId: string) {
  try {
    // 1. Get the Request and its items
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: { items: true }
    })

    if (!request) {
      return { success: false, message: 'Request not found' }
    }

    // Check if POs were already generated for this request
    const existingPOs = await prisma.purchaseOrder.findFirst({
      where: {
        notes: {
          contains: `Request #${request.id}`
        }
      }
    })

    if (request.status === 'PROCESSED' && existingPOs) {
      return { success: true, message: 'Request already processed (POs exist)' }
    }

    // 2. Get all Suppliers
    const suppliers = await prisma.supplier.findMany()
    console.log(`[PO-Gen] Found ${suppliers.length} suppliers`)
    
      // 3. Group items by Supplier (using Smart Dictionary)
    // We group by Supplier FIRST, not by Category, because multiple categories might map to the same Supplier.
    const itemsBySupplierId: Record<string, typeof request.items> = {}
    
    // Comprehensive Keyword Dictionary (The "Google Knowledge")
    const KEYWORD_MAPPING: Record<string, string[]> = {
      'Supplier Bumbu': ['bumbu', 'garam', 'gula', 'merica', 'ladaku', 'penyedap', 'kaldu', 'chicken powder', 'masako', 'royco', 'kunyit', 'jahe', 'lengkuas', 'serai', 'daun salam', 'ketumbar', 'kemiri', 'pala', 'kayu manis', 'cengkeh', 'terasi', 'kecap', 'saos', 'saus', 'sambal', 'cuka', 'minyak', 'kara', 'micin', 'sasa', 'ajinomoto', 'powder', 'bubuk', 'brambang', 'bawang goreng', 'bunga lawang', 'kapulaga', 'keluwek', 'kluwek', 'andaliman', 'kecombrang', 'tempoyak', 'cincalok', 'honje', 'kemukus', 'klabet', 'fenugreek', 'pandan', 'daun pandan'],
      'Supplier Kelapa': ['kelapa', 'santan', 'degan', 'kambil', 'coconut'],
      'Supplier Bahan Minuman': ['nata de coco', 'cincau', 'kolang-kaling', 'sirup', 'syrup', 'marjan', 'abc', 'agar-agar', 'jelly', 'nutrijell', 'selasih', 'cendol', 'dawet', 'tape', 'sagoo', 'mutiara', 'teh', 'tea', 'kopi', 'coffee', 'coklat bubuk', 'cocoa', 'drink', 'minuman'],
      'Supplier Sayur-mayur': ['sayur', 'bayam', 'kangkung', 'sawi', 'kol', 'kubis', 'wortel', 'kentang', 'tomat', 'cabe', 'cabai', 'bawang bombay', 'bawang putih', 'bawang merah', 'seledri', 'daun bawang', 'labu', 'terong', 'timun', 'jagung', 'buncis', 'kacang panjang', 'tauge', 'jamur', 'vegetable', 'kacang', 'tahu', 'tempe'],
      'Supplier Umbi-umbian': ['singkong', 'ubi', 'talas', 'cassava', 'tales', 'gadung', 'gembili', 'porang', 'sweet potato'], 
      'Supplier Daging Ayam': ['ayam', 'dada', 'paha', 'sayap', 'ceker', 'hati', 'ampela', 'kulit', 'chicken', 'fillet'],
      'Supplier Beras': ['beras', 'ketan', 'nasi', 'rice'],
      'Supplier Telur': ['telur', 'egg'],
      'Supplier Susu': ['susu', 'ultra', 'greenfields', 'diamond', 'cimory', 'yogurt', 'keju', 'cheese', 'butter', 'mentega', 'margarin', 'cream', 'milk'],
      'Supplier Roti & Kue': ['roti', 'kue', 'bakpia', 'bakpau', 'donat', 'bolu', 'cake', 'tart', 'biskuit', 'wafer', 'snack', 'bread', 'pastry'],
      'Supplier Buah': ['buah', 'jeruk', 'apel', 'mangga', 'pisang', 'pepaya', 'semangka', 'melon', 'anggur', 'lengkeng', 'rambutan', 'salak', 'nanas', 'fruit', 'lemon', 'lime']
    }

    // Helper to find supplier by Item Name OR Category
    const findSupplier = (item: { itemName: string, category?: string | null }) => {
      // Clean up item name for better matching (trim, lowercase)
      const cleanName = item.itemName.toLowerCase().trim()
      const cleanCategory = (item.category || '').toLowerCase().trim()
      
      // PRIORITIZE EXACT OR STRONG MATCHES FIRST to avoid false positives
      // Example: "Roti sosis" contains "sosis" (Bumbu/Daging?) but should be "Roti"
      
      // 1. Specific Supplier Checks (Order matters!)
      
      // Supplier Telur (High Priority)
      if (cleanName.includes('telur') || cleanName.includes('egg')) {
         const s = suppliers.find(sup => sup.name === 'Supplier Telur')
         if (s) return s
      }

      // Supplier Roti & Kue
      if (['roti', 'kue', 'bakpia', 'bakpau', 'donat', 'cake', 'bread'].some(k => cleanName.includes(k))) {
         const s = suppliers.find(sup => sup.name === 'Supplier Roti & Kue')
         if (s) return s
      }
      
      // Supplier Susu
      if (['susu', 'milk', 'yogurt', 'cheese', 'keju', 'butter', 'mentega', 'cream'].some(k => cleanName.includes(k))) {
         const s = suppliers.find(sup => sup.name === 'Supplier Susu')
         if (s) return s
      }

      // Supplier Sayur
      if (['sayur', 'bayam', 'kangkung', 'sawi', 'kol', 'kubis', 'wortel', 'kentang', 'tomat', 'cabe', 'cabai', 'bawang', 'seledri', 'labu', 'terong', 'timun', 'jagung', 'buncis', 'tauge', 'jamur', 'tahu', 'tempe', 'kacang'].some(k => cleanName.includes(k))) {
         // Exception: 'Bawang Goreng' -> Bumbu
         if (!cleanName.includes('bawang goreng')) {
            const s = suppliers.find(sup => sup.name === 'Supplier Sayur-mayur')
            if (s) return s
         }
      }

      // Supplier Buah
      if (['buah', 'jeruk', 'apel', 'mangga', 'pisang', 'pepaya', 'semangka', 'melon', 'anggur', 'lengkeng', 'rambutan', 'salak', 'nanas', 'lemon', 'lime'].some(k => cleanName.includes(k))) {
         const s = suppliers.find(sup => sup.name === 'Supplier Buah')
         if (s) return s
      }

      // Supplier Daging Ayam
      if (['ayam', 'dada', 'paha', 'sayap', 'ceker', 'hati', 'ampela', 'kulit', 'chicken', 'fillet', 'karkas', 'daging ayam', 'ayam dadu'].some(k => cleanName.includes(k))) {
         // EXCEPTION: Check if it's actually Bumbu (e.g. Chicken Powder)
         if (['powder', 'bubuk', 'bumbu', 'kaldu', 'penyedap'].some(k => cleanName.includes(k))) {
             const s = suppliers.find(sup => sup.name === 'Supplier Bumbu')
             if (s) return s
         }

         const s = suppliers.find(sup => sup.name === 'Supplier Daging Ayam')
         if (s) return s
      }

      // Supplier Bumbu (Catch-all for spices/condiments)
      // Check for Bawang Goreng explicitly here or inside Bumbu
      if (cleanName.includes('bawang goreng')) {
          const s = suppliers.find(sup => sup.name === 'Supplier Bumbu')
          if (s) return s
      }

      if (['bumbu', 'garam', 'gula', 'merica', 'ladaku', 'penyedap', 'kaldu', 'masako', 'royco', 'kunyit', 'jahe', 'lengkuas', 'serai', 'salam', 'ketumbar', 'kemiri', 'pala', 'kayu manis', 'cengkeh', 'terasi', 'kecap', 'saos', 'saus', 'sambal', 'cuka', 'minyak', 'kara', 'santan', 'micin', 'sasa', 'ajinomoto', 'powder', 'bubuk', 'pandan'].some(k => cleanName.includes(k))) {
         const s = suppliers.find(sup => sup.name === 'Supplier Bumbu')
         if (s) return s
      }


      // 2. Fallback to General Keyword Mapping (if not caught above)
      const textToSearch = (cleanName + ' ' + cleanCategory)


      // 2. Fallback: Fuzzy match supplier name
      const matched = suppliers.find(s => 
        textToSearch.includes(s.name.toLowerCase().replace('supplier', '').trim())
      )
      if (matched) return matched

      // 3. Last Resort: General Supplier or First Supplier
      const general = suppliers.find(s => s.name.toLowerCase().includes('general'))
      return general || suppliers[0]
    }

    // Group items
    for (const item of request.items) {
      const supplier = findSupplier(item)
      if (supplier) {
        if (!itemsBySupplierId[supplier.id]) {
          itemsBySupplierId[supplier.id] = []
        }
        itemsBySupplierId[supplier.id].push(item)
      } else {
        console.warn(`[PO-Gen] No supplier found for item: ${item.itemName}`)
      }
    }

    console.log(`[PO-Gen] Grouped items into ${Object.keys(itemsBySupplierId).length} suppliers`)


    // 4. Process each Supplier group
    let createdPOCount = 0
    
    for (const [supplierId, items] of Object.entries(itemsBySupplierId)) {
      if (items.length === 0) continue

      const supplier = suppliers.find(s => s.id === supplierId)
      if (!supplier) continue


      // Generate a unique PO Number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      // Check for collision and regenerate if necessary
      let poNumber = `PO-${dateStr}-${supplier.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      let existingPO = await prisma.purchaseOrder.findUnique({ where: { poNumber } })
      
      let attempts = 0
      while (existingPO && attempts < 10) {
         attempts++
         poNumber = `PO-${dateStr}-${supplier.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
         existingPO = await prisma.purchaseOrder.findUnique({ where: { poNumber } })
      }

      // Prepare items for PO (and ensure Product Master Data exists)
      const poItems = []
      let totalAmount = 0

      // AGGREGATION LOGIC: Group items by Name + Unit
      const aggregatedItems: Record<string, {
        itemName: string,
        category?: string | null,
        unit: string,
        quantity: number,
        price: number,
        notes?: string | null
      }> = {}

      for (const reqItem of items) {
        // Create a unique key for grouping (Name + Unit) to handle same item with different units separately
        // Lowercase name for case-insensitive grouping
        const key = `${reqItem.itemName.trim().toLowerCase()}-${reqItem.unit.trim().toLowerCase()}`
        
        if (!aggregatedItems[key]) {
          aggregatedItems[key] = {
            itemName: reqItem.itemName, // Keep original casing of first occurrence
            category: reqItem.category,
            unit: reqItem.unit,
            quantity: 0,
            price: reqItem.price, // Use price of first occurrence
            notes: reqItem.notes
          }
        }

        // Sum quantity
        aggregatedItems[key].quantity += reqItem.quantity
        
        // Append notes if they are different and exist
        if (reqItem.notes && aggregatedItems[key].notes && !aggregatedItems[key].notes?.includes(reqItem.notes)) {
           aggregatedItems[key].notes += `, ${reqItem.notes}`
        }
      }

      // Convert aggregated items back to array
      const finalItems = Object.values(aggregatedItems)

      for (const reqItem of finalItems) {
        // Find or Create Product
        let product = await prisma.product.findFirst({
          where: { 
            name: reqItem.itemName 
          }
        })

        if (!product) {
          // Auto-create Product if not exists (Smart System!)
          // Generate SKU from name
          const sku = reqItem.itemName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '-')
            .substring(0, 20)
          
          // Check if SKU exists, if so append random
          const existingSku = await prisma.product.findUnique({ where: { sku } })
          const finalSku = existingSku ? `${sku}-${Math.random().toString(36).substring(7)}` : sku

          // Use category from request if available, otherwise default to 'Lain-lain'
          // We already mapped categories in upload-request.ts (Bahan Kering, Basah, Sayur, etc)
          const category = reqItem.category && reqItem.category !== 'Uncategorized' ? reqItem.category : 'Lain-lain'

          product = await prisma.product.create({
            data: {
              name: reqItem.itemName,
              sku: finalSku,
              category: category,
              unit: reqItem.unit,
              price: reqItem.price,
              supplierId: supplier.id
            }
          })
        }

        // Add to PO Items
        poItems.push({
          productId: product.id,
          quantity: reqItem.quantity,
          unit: reqItem.unit,
          price: reqItem.price,
          notes: reqItem.notes
        })

        totalAmount += (reqItem.quantity * reqItem.price)
      }

      // Create the PO
      await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: supplier.id,
          status: 'PENDING', // Draft status
          totalAmount,
          notes: `Generated from Request #${request.id} (Supplier: ${supplier.name})`,
          items: {
            create: poItems
          }
        }
      })
      
      createdPOCount++
    }

    // 5. Update Request Status
    await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSED' }
    })

    revalidatePath('/purchase-orders')
    revalidatePath('/inventory/incoming')

    return { 
      success: true, 
      message: `Berhasil membuat ${createdPOCount} Draft PO untuk ${Object.keys(itemsBySupplierId).length} Supplier.` 
    }

  } catch (error) {
    console.error('Error generating POs:', error)
    return { success: false, message: 'Gagal membuat PO otomatis: ' + (error as Error).message }
  }
}
