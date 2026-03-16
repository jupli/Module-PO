'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function rejectPurchaseRequest(requestId: string, reason: string) {
  try {
    // Use raw query to avoid issues with outdated Prisma Client if generate fails
    await prisma.$executeRaw`UPDATE PurchaseRequest SET status = 'REJECTED', rejectionReason = ${reason} WHERE id = ${requestId}`

    revalidatePath('/purchasing/submission')
    revalidatePath(`/share/po/${requestId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error rejecting request:', error)
    return { success: false, error: 'Failed to reject request' }
  }
}
