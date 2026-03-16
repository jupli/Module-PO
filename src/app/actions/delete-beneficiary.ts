'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteBeneficiariesByDate(date: string) {
  try {
    const targetDate = new Date(date)
    
    await prisma.beneficiary.deleteMany({
      where: {
        date: targetDate
      }
    })

    revalidatePath('/purchasing/request')
    return { success: true, message: 'Data berhasil dihapus' }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, message: 'Gagal menghapus data' }
  }
}
