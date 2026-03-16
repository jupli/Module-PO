'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteRequest(requestId: string) {
  try {
    await (prisma as any).purchaseRequest.delete({
      where: { id: requestId }
    })
    revalidatePath('/purchasing/request')
    return { success: true, message: 'Permintaan berhasil dihapus' }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, message: 'Gagal menghapus permintaan' }
  }
}

export async function processRequest(requestId: string) {
  try {
    // For now, "Proses" means changing status to APPROVED
    // This could later trigger PO creation or other workflows
    await (prisma as any).purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' }
    })
    revalidatePath('/purchasing/request')
    return { success: true, message: 'Permintaan berhasil diproses' }
  } catch (error) {
    console.error('Process error:', error)
    return { success: false, message: 'Gagal memproses permintaan' }
  }
}
