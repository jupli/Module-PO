'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { MovementType } from '@prisma/client'

export async function createGoodsIssue(data: {
  items: { productId: string, quantity: number }[]
  description: string
  reference?: string
}) {
  try {
    await prisma.$transaction(async (tx: any) => {
      for (const item of data.items) {
        if (item.quantity <= 0) continue

        // Check stock availability
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) throw new Error(`Product ${item.productId} not found`)
        if (product.quantity < item.quantity) {
          throw new Error(`Stok tidak mencukupi untuk ${product.name} (Tersedia: ${product.quantity})`)
        }

        // Update product quantity
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: item.quantity }
          }
        })

        // Create Stock Movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.OUT,
            quantity: item.quantity,
            reference: data.reference || 'USAGE',
            notes: data.description
          }
        })
      }
    })

    revalidatePath('/inventory/outgoing')
    revalidatePath('/products')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to create goods issue:', error)
    return { success: false, error: error.message }
  }
}

export async function getStockMovements(filters?: {
  startDate?: Date
  endDate?: Date
  type?: MovementType
  productId?: string
}) {
  try {
    const where: any = {}

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate
      }
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.productId) {
      where.productId = filters.productId
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { name: true, unit: true, category: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit for performance, maybe add pagination later
    })

    return { success: true, data: movements }
  } catch (error) {
    console.error('Failed to fetch stock movements:', error)
    return { success: false, error: 'Failed to fetch stock movements' }
  }
}
