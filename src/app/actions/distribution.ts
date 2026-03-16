'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getDistributionItems() {
  try {
    const items = await prisma.deliveryQueue.findMany({
      orderBy: { cookDate: 'desc' }
    })
    return { success: true, data: items }
  } catch (error) {
    console.error('Error fetching distribution items:', error)
    return { success: false, error: 'Failed to fetch items' }
  }
}

export async function submitQC(id: string, data: { status: 'PASS' | 'REJECT', qcBy: string, notes: string, photoUrl?: string }) {
  try {
    await prisma.deliveryQueue.update({
      where: { id },
      data: {
        status: data.status === 'PASS' ? 'READY_TO_SHIP' : 'REJECTED',
        qcStatus: data.status,
        qcBy: data.qcBy,
        qcDate: new Date(),
        qcNotes: data.notes,
        photoUrl: data.photoUrl
      }
    })
    
    revalidatePath('/distribution')
    return { success: true }
  } catch (error) {
    console.error('Error submitting QC:', error)
    return { success: false, error: 'Failed to submit QC' }
  }
}

export async function shipItem(id: string, data?: {
  senderName: string
  destination: string
  receiverName: string
  arrivalTime?: string // ISO string or time string
  senderSign: string
  receiverSign?: string
  shippedAt: Date
}) {
  try {
    const updatedQueue = await prisma.deliveryQueue.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        shippedAt: data?.shippedAt || new Date(),
        senderName: data?.senderName,
        destination: data?.destination,
        receiverName: data?.receiverName,
        arrivalTime: data?.arrivalTime ? new Date(data.arrivalTime) : undefined,
        senderSign: data?.senderSign,
        receiverSign: data?.receiverSign
      }
    })

    // Create DeliveryForm record
    // @ts-ignore: deliveryForm might not be generated yet
    await prisma.deliveryForm.create({
      data: {
        deliveryQueueId: id,
        formTitle: updatedQueue.menuName,
        courierName: updatedQueue.senderName || 'Unknown',
        senderName: null,
        pickupAt: updatedQueue.shippedAt || new Date(),
        destination: updatedQueue.destination || '',
        portions: updatedQueue.quantity,
        receiverName: updatedQueue.receiverName,
        photoUrl: updatedQueue.photoUrl,
        courierSign: updatedQueue.senderSign,
        senderSign: null
      }
    })
    
    revalidatePath('/distribution')
    return { success: true }
  } catch (error) {
    console.error('Error shipping item:', error)
    return { success: false, error: 'Failed to ship item' }
  }
}
