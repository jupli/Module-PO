// @ts-nocheck
'use server'

import { prisma } from '@/lib/prisma'
import { getCategoryByItemName } from '@/lib/item-categories'
import { revalidatePath } from 'next/cache'

interface RequestItem {
  name: string
  quantity: number
  price: number
  unit: string
  category?: string
}

export async function generatePOsFromRequest(requestNumber: string, items: RequestItem[], documentPath?: string) {
  try {
    // 1. Group items by Supplier Category
    const itemsByCategory: Record<string, RequestItem[]> = {}

    for (const item of items) {
      const category = getCategoryByItemName(item.name)
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = []
      }
      itemsByCategory[category].push(item)
    }

    const createdPOs = []

    // 2. Process each category
    for (const [categoryName, categoryItems] of Object.entries(itemsByCategory)) {
      // Find or Create Supplier
      let supplier = await prisma.supplier.findFirst({
        where: { name: categoryName }
      })

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: categoryName,
            address: 'Alamat ' + categoryName,
            contact: 'Contact ' + categoryName,
            email: 'email@' + categoryName.toLowerCase().replace(/\s+/g, '') + '.com',
            phone: '08123456789'
          }
        })
      }

      // Create Purchase Order
      // Generate a unique PO Number: PO-{YYYYMMDD}-{Random}
      const date = new Date()
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
      const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const poNumber = `PO-${dateStr}-${randomStr}-${supplier.name.substring(0, 3).toUpperCase()}`

      // Calculate total amount
      const totalAmount = categoryItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: poNumber,
          supplierId: supplier.id,
          date: new Date(),
          status: 'PENDING',
          totalAmount: totalAmount,
          notes: `Generated from Request ${requestNumber}`,
          documentPath: documentPath || null
        }
      })

      // 3. Process Items for this PO
      for (const item of categoryItems) {
        // Normalize name and SKU
        const normalizedName = item.name.trim()
        const skuCandidate = normalizedName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')

        // Find or Create Product
        let product = await prisma.product.findUnique({
          where: { sku: skuCandidate }
        })

        if (!product) {
            // Try by name (case insensitive)
            product = await prisma.product.findFirst({
                where: { 
                    name: {
                        equals: normalizedName
                    }
                }
            })
        }

        if (!product) {
          try {
            product = await prisma.product.create({
                data: {
                name: normalizedName,
                sku: skuCandidate,
                price: item.price,
                unit: item.unit,
                category: categoryName
                }
            })
          } catch (e) {
             // Retry fetch if race condition
             product = await prisma.product.findUnique({
                where: { sku: skuCandidate }
             })
          }
        }

        if (!product) throw new Error(`Failed to process product: ${item.name}`)

        // Create PO Item
        await prisma.purchaseOrderItem.create({
          data: {
            purchaseOrderId: po.id,
            productId: product.id,
            quantity: item.quantity,
            // @ts-ignore
            price: item.price,
            unit: item.unit
          }
        })
      }

      createdPOs.push(po)
    }

    revalidatePath('/purchase-orders')
    return { success: true, count: createdPOs.length, message: `Berhasil membuat ${createdPOs.length} Purchase Order.` }

  } catch (error) {
    console.error('Error generating POs:', error)
    return { success: false, count: 0, message: 'Gagal membuat Purchase Order: ' + (error as Error).message }
  }
}
