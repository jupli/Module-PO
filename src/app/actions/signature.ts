'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { generatePurchaseOrders } from './po-generator'

export async function saveSignature(requestId: string, role: 'purchasing' | 'manager', signatureDataUrl: string) {
  try {
    // Use raw query to avoid issues with outdated Prisma Client
    // Also prevent signing if request is rejected
    let result: unknown
    const signatureValue = signatureDataUrl === '' ? null : signatureDataUrl
    
    if (role === 'purchasing') {
      result = await prisma.$executeRaw`UPDATE PurchaseRequest SET purchasingSign = ${signatureValue} WHERE id = ${requestId} AND status != 'REJECTED'`
    } else {
      result = await prisma.$executeRaw`UPDATE PurchaseRequest SET managerSign = ${signatureValue} WHERE id = ${requestId} AND status != 'REJECTED'`
    }

    if (Number(result) === 0) {
       // Could be ID not found OR status is REJECTED
       return { success: false, error: 'Request not found or has been rejected' }
    }

    // Auto-generate POs if both signatures are present
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      select: { purchasingSign: true, managerSign: true, status: true }
    })

    if (request && request.purchasingSign && request.managerSign && request.status !== 'PROCESSED') {
       console.log(`[Signature] Both signatures present for ${requestId}. Auto-generating POs...`)
       await generatePurchaseOrders(requestId)
    }

    revalidatePath('/purchasing/submission')
    revalidatePath(`/share/po/${requestId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error saving signature:', error)
    return { success: false, error: 'Failed to save signature' }
  }
}
