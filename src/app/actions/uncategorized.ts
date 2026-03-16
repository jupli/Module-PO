
'use server'

import { prisma } from '@/lib/prisma'

export async function getUncategorizedCount() {
  try {
    const count = await prisma.product.count({
      where: {
        AND: [
          { category: { not: 'Bahan Basah' } },
          { category: { not: 'Bahan Kering' } }
        ]
      }
    })
    return count
  } catch (error) {
    console.error('Failed to get uncategorized count:', error)
    return 0 // Return 0 to prevent UI crash
  }
}

export async function getUncategorizedItems() {
  const items = await prisma.product.findMany({
    where: {
      AND: [
        { category: { not: 'Bahan Basah' } },
        { category: { not: 'Bahan Kering' } }
      ]
    },
    orderBy: {
      name: 'asc'
    }
  })
  return items
}

export async function updateItemCategory(id: string, category: string) {
  await prisma.product.update({
    where: { id },
    data: { category }
  })
  return { success: true }
}
