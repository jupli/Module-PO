'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateItemPrice(itemId: string, price: number) {
  try {
    await (prisma as any).purchaseRequestItem.update({
      where: { id: itemId },
      data: { price }
    })
    revalidatePath('/purchasing/purchase')
    return { success: true }
  } catch (error) {
    console.error('Update price error:', error)
    return { success: false, message: 'Gagal update harga' }
  }
}

export async function submitToPurchase(requestId: string) {
  try {
    // Check if all items have price > 0
    const request = await (prisma as any).purchaseRequest.findUnique({
      where: { id: requestId },
      include: { items: true }
    })

    if (!request) return { success: false, message: 'Request not found' }

    const invalidItems = request.items.filter((item: any) => item.price <= 0)
    if (invalidItems.length > 0) {
      return { success: false, message: `Ada ${invalidItems.length} item yang belum memiliki harga (atau harga 0).` }
    }

    // Change status to PROCESSED (meaning it's done in Purchase phase, moved to Submission/PO)
    // Also clear rejection reason and signatures if any
    await prisma.$executeRaw`
      UPDATE PurchaseRequest 
      SET status = 'PROCESSED', rejectionReason = NULL, purchasingSign = NULL, managerSign = NULL 
      WHERE id = ${requestId}
    `

    // Here we could also create a PurchaseOrder record if needed
    // But for now, we just mark it as processed from this view

    revalidatePath('/purchasing/purchase')
    revalidatePath('/purchasing/submission')
    return { success: true, message: 'Berhasil diajukan ke Pembelian' }
  } catch (error) {
    console.error('Submit error:', error)
    return { success: false, message: 'Gagal mengajukan pembelian' }
  }
}
