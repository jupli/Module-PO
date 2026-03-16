'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        // Get latest usage from StockMovement (OUT)
        stockMovements: {
          where: { type: 'OUT' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        // Get latest purchase from PurchaseOrderItem -> PurchaseOrder
        purchaseOrderItems: {
          orderBy: { id: 'desc' }, // Latest created item
          take: 1,
          include: {
            purchaseOrder: {
              select: { date: true }
            }
          }
        }
      }
    })

    return products.map((product: any) => {
      const lastUsage = product.stockMovements[0]
      const lastPOItem = product.purchaseOrderItems[0]
      
      // Clean up the object
      const { stockMovements, purchaseOrderItems, ...rest } = product
      
      return {
        ...rest,
        lastPurchaseDate: lastPOItem?.purchaseOrder?.date || null,
        lastUsageDate: lastUsage?.createdAt || null
      }
    })
  } catch (error) {
    console.error('Database Error:', error)
    return []
  }
}

export async function getProductsByCategory(category: string) {
  try {
    return await prisma.product.findMany({
      where: { category },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error('Database Error:', error)
    return []
  }
}

export async function getCategories() {
  try {
    const products = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category']
    })
    return products.map((p: { category: string | null }) => p.category).filter(Boolean)
  } catch (error) {
    console.error('Database Error:', error)
    return []
  }
}

export async function createProduct(formData: FormData) {
  const name = formData.get('name') as string
  const sku = formData.get('sku') as string
  const description = formData.get('description') as string
  const quantity = parseInt(formData.get('quantity') as string) || 0
  const price = parseFloat(formData.get('price') as string) || 0
  const unit = formData.get('unit') as string
  const category = formData.get('category') as string

  try {
    await prisma.product.create({
      data: {
        name,
        sku,
        description,
        quantity,
        price,
        unit,
        category
      }
    })
    revalidatePath('/products')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to create product' }
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const sku = formData.get('sku') as string
  const description = formData.get('description') as string
  // Quantity cannot be updated directly via edit to maintain stock integrity
  const price = parseFloat(formData.get('price') as string) || 0
  const unit = formData.get('unit') as string
  const category = formData.get('category') as string

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        description,
        price,
        unit,
        ...(category && { category }) // Only update if category is provided
      }
    })
    revalidatePath('/products')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update product' }
  }
}

export async function switchProductCategory(id: string, newCategory: string) {
    try {
        await prisma.product.update({
            where: { id },
            data: { category: newCategory }
        })
        revalidatePath('/products')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to switch category' }
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({
            where: { id }
        })
        revalidatePath('/products')
        return { success: true }
    } catch (error) {
        console.error('Delete Error:', error)
        return { success: false, error: 'Failed to delete product. It might be used in other records.' }
    }
}
