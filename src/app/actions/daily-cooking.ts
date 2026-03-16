'use server'

import { prisma } from '@/lib/prisma'
import { MovementType } from '@prisma/client'

export async function getDailyCookingData(dateStr: string) {
  try {
    // dateStr is YYYY-MM-DD
    const startOfDay = new Date(dateStr)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(dateStr)
    endOfDay.setHours(23, 59, 59, 999)

    // 1. Get Beneficiaries
    const beneficiaries = await prisma.beneficiary.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    const totalBeneficiaries = beneficiaries.reduce((sum, b) => sum + b.total, 0)
    
    // 2. Get Menu Items from PurchaseRequestItem (Ingredients)
    // We assume Purchase Request Date corresponds to Usage Date (or at least close enough for planning)
    // The user specifically asked: "SEBELAH KANAN AKAN MUNCUL SEMUA NAMA-NAMA BAHAN YANG TERCATAT PADA TANGGAL REQUEST TERSEBUT"
    
    const requestItems = await prisma.purchaseRequestItem.findMany({
      where: {
        purchaseRequest: {
          requestDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      },
      select: {
        itemName: true,
        quantity: true,
        unit: true,
        category: true,
        portion: true
      }
    })

    // Group items
    const itemsMap = new Map()
    
    for (const item of requestItems) {
      const key = item.itemName.trim()
      
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          name: item.itemName,
          quantity: 0,
          unit: item.unit,
          category: item.category,
          portion: item.portion,
          stock: 0 // Default stock
        })
      }
      
      const current = itemsMap.get(key)
      current.quantity += item.quantity
    }

    // 3. Get Stock from Product Table
    const itemNames = Array.from(itemsMap.keys())
    const products = await prisma.product.findMany({
      where: {
        name: { in: itemNames }
      },
      select: {
        name: true,
        quantity: true,
        unit: true
      }
    })

    // Map stock back to items
    for (const product of products) {
        if (itemsMap.has(product.name)) {
            const item = itemsMap.get(product.name)
            item.stock = product.quantity
            // Optional: Update unit if missing or different? 
            // prioritizing PR unit for now as it is the usage unit.
        }
    }

    const items = Array.from(itemsMap.values())

    // 4. Check if already submitted/processed
    // We check if there are any stock movements with reference USAGE-{dateStr}
    const existingUsage = await prisma.stockMovement.findFirst({
      where: {
        reference: `USAGE-${dateStr}`
      },
      select: { id: true }
    })
    
    const isSubmitted = !!existingUsage

    return {
      success: true,
      data: {
        date: dateStr,
        totalBeneficiaries,
        beneficiaries, 
        items,
        isSubmitted
      }
    }

  } catch (error) {
    console.error('Error fetching daily cooking data:', error)
    return { success: false, error: 'Failed to fetch data' }
  }
}

export async function processDailyUsage(dateStr: string, items: any[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: 'No items to process' }
    }

    const result = await prisma.$transaction(async (tx) => {
      const processedItems = []
      const skippedItems = []

      for (const item of items) {
        // Find product by name (case-insensitive search would be better but let's stick to exact or simple normalization for now)
        // Since we grouped by trimmed name in getDailyCookingData, we should use that.
        const product = await tx.product.findFirst({
          where: {
            name: item.name
          }
        })

        if (!product) {
          skippedItems.push(item.name)
          continue
        }

        // Deduct stock
        // Note: We allow stock to go negative if physical stock > system stock, 
        // but typically we should warn. For now, we proceed.
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: { decrement: item.quantity }
          }
        })

        // Record movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: MovementType.OUT,
            quantity: item.quantity,
            reference: `USAGE-${dateStr}`,
            notes: `Daily Usage for ${dateStr}`
          }
        })

        processedItems.push(item.name)
      }

      // Create DeliveryQueue items from Beneficiaries (Packages)
      const startOfDay = new Date(dateStr)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(dateStr)
      endOfDay.setHours(23, 59, 59, 999)

      const beneficiaries = await tx.beneficiary.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })

      // Create separate queue item for EACH beneficiary
      for (const ben of beneficiaries) {
        // Skip if total portion is 0 or less
        if (ben.total <= 0) continue

        // Check if already exists to avoid duplicates
        // Note: checking by menuName + destination + cookDate
        const existingQueue = await tx.deliveryQueue.findFirst({
          where: {
            menuName: ben.category || 'Uncategorized',
            destination: ben.name,
            cookDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        })

        if (!existingQueue) {
          await tx.deliveryQueue.create({
            data: {
              menuName: ben.category || 'Uncategorized',
              quantity: ben.total,
              cookDate: startOfDay,
              status: 'PENDING_QC',
              destination: ben.name // Store beneficiary name as destination
            }
          })
        }
      }

      return { processed: processedItems, skipped: skippedItems }
    }, {
      timeout: 60000 // Increase timeout to 60 seconds
    })

    return { success: true, data: result }

  } catch (error) {
    console.error('Error processing daily usage:', error)
    return { success: false, error: 'Failed to process daily usage' }
  }
}
