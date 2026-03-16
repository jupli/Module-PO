'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function movePurchaseOrderItem(itemId: string, targetSupplierId: string, currentPOId: string) {
  try {
    // 1. Get the item
    const item = await prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
      include: { purchaseOrder: true }
    })
    
    if (!item) return { success: false, message: 'Item not found' }

    const currentPO = item.purchaseOrder

    if (!currentPO) return { success: false, message: 'Current PO not found' }

    // 2. Check if a PO exists for the target supplier on the SAME DAY
    const dateStart = new Date(currentPO.date)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(currentPO.date)
    dateEnd.setHours(23, 59, 59, 999)

    let targetPO = await prisma.purchaseOrder.findFirst({
      where: {
        supplierId: targetSupplierId,
        date: {
          gte: dateStart,
          lte: dateEnd
        },
        // We might match status too, e.g. PENDING, to avoid moving to an already received PO?
        // But maybe user wants to correct it even if sent? 
        // Let's assume PENDING or APPROVED is fine. RECEIVED is risky but maybe necessary if correction.
        // For now, we just find the PO.
      },
      include: { items: true }
    })

    // 3. If no target PO, create one
    if (!targetPO) {
        const supplier = await prisma.supplier.findUnique({ where: { id: targetSupplierId } })
        if (!supplier) return { success: false, message: 'Supplier not found' }

        // Generate PO Number
        const dateStr = currentPO.date.toISOString().slice(0, 10).replace(/-/g, '')
        const poNumber = `PO-${dateStr}-${supplier.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
        
        // Ensure uniqueness
        let uniquePoNumber = poNumber
        let attempts = 0
        while (attempts < 5) {
            const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber: uniquePoNumber } })
            if (!existing) break
            uniquePoNumber = `PO-${dateStr}-${supplier.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
            attempts++
        }

        targetPO = await prisma.purchaseOrder.create({
            data: {
                poNumber: uniquePoNumber,
                supplierId: targetSupplierId,
                date: currentPO.date,
                status: 'PENDING', // New PO is pending
                totalAmount: 0,
                notes: currentPO.notes // Copy notes context
            },
            include: { items: true }
        })
    }

    // 4. Move the item
    await prisma.$transaction(async (tx) => {
        // Check if item already exists in target PO (merge)
        // We match by productId and unit
        const existingItem = targetPO!.items.find(i => i.productId === item.productId && i.unit === item.unit)

        if (existingItem) {
            // Update quantity
            await tx.purchaseOrderItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: { increment: item.quantity }
                    // We keep existing price of target PO item or average? 
                    // Usually price is per product, so should be same.
                }
            })
            // Delete original item
            await tx.purchaseOrderItem.delete({ where: { id: itemId } })
        } else {
            // Re-assign item to new PO
            await tx.purchaseOrderItem.update({
                where: { id: itemId },
                data: {
                    purchaseOrderId: targetPO!.id
                }
            })
        }

        // 5. Update Totals for BOTH POs
        // Recalculate Old PO Total
        const oldPOItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: currentPOId } })
        const oldTotal = oldPOItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.price)), 0)
        
        if (oldPOItems.length === 0) {
            // Delete empty PO if it has no items left
            // Check if it has payments or receipts? 
            // If strictly PENDING/APPROVED/KIRIM, maybe safe to delete.
            // If RECEIVED, do not delete?
            if (currentPO.status !== 'RECEIVED' && currentPO.status !== 'CANCELLED') {
                 await tx.purchaseOrder.delete({ where: { id: currentPOId } })
            } else {
                 await tx.purchaseOrder.update({
                    where: { id: currentPOId },
                    data: { totalAmount: oldTotal }
                })
            }
        } else {
            await tx.purchaseOrder.update({
                where: { id: currentPOId },
                data: { totalAmount: oldTotal }
            })
        }

        // Recalculate New PO Total
        const newPOItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: targetPO!.id } })
        const newTotal = newPOItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.price)), 0)
        await tx.purchaseOrder.update({
            where: { id: targetPO!.id },
            data: { totalAmount: newTotal }
        })
    })

    revalidatePath('/purchase-orders')
    return { success: true, message: 'Item moved successfully' }

  } catch (error) {
    console.error('Error moving item:', error)
    return { success: false, message: 'Failed to move item: ' + (error as Error).message }
  }
}
