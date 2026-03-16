'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createPayment(data: {
  poId: string
  amount: number
  method: string
  reference?: string
  notes?: string
  proofImage?: string
}) {
  try {
    // 1. Create Payment Record
    const payment = await prisma.purchasePayment.create({
      data: {
        purchaseOrderId: data.poId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        proofImage: data.proofImage,
      },
    })

    // 2. Recalculate PO Payment Status
    await updatePOPaymentStatus(data.poId)

    revalidatePath('/purchase-orders')
    revalidatePath(`/purchase-orders/${data.poId}`)
    
    return { success: true, payment }
  } catch (error) {
    console.error('Failed to create payment:', error)
    return { success: false, error: 'Failed to create payment' }
  }
}

export async function deletePayment(paymentId: string, poId: string) {
  try {
    await prisma.purchasePayment.delete({
      where: { id: paymentId },
    })

    await updatePOPaymentStatus(poId)

    revalidatePath('/purchase-orders')
    revalidatePath(`/purchase-orders/${poId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to delete payment:', error)
    return { success: false, error: 'Failed to delete payment' }
  }
}

async function updatePOPaymentStatus(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { payments: true }, 
  })

  if (!po) return

  const totalPaid = po.payments.reduce((sum, p) => sum + p.amount, 0)
  const totalAmount = po.totalAmount

  let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'

  if (totalPaid >= totalAmount) {
    status = 'PAID'
  } else if (totalPaid > 0) {
    status = 'PARTIAL'
  }

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { paymentStatus: status },
  })
}
