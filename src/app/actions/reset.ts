'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function resetDatabase() {
  try {
    // 1. Delete Goods Receipt Items (Child of GoodsReceipt)
    await prisma.goodsReceiptItem.deleteMany({})
    
    // 2. Delete Goods Receipts (Child of PurchaseOrder)
    await prisma.goodsReceipt.deleteMany({})
    
    // 3. Delete Purchase Order Items (Child of PurchaseOrder)
    await prisma.purchaseOrderItem.deleteMany({})
    
    // 4. Delete Purchase Orders
    await prisma.purchaseOrder.deleteMany({})
    
    // 5. Delete Purchase Request Items (Child of PurchaseRequest)
    await prisma.purchaseRequestItem.deleteMany({})
    
    // 6. Delete Purchase Requests
    await prisma.purchaseRequest.deleteMany({})
    
    // 7. Delete Recipe Items
    await prisma.recipeItem.deleteMany({})
    
    // 8. Delete Recipes
    await prisma.recipe.deleteMany({})
    
    // 9. Delete Stock Movements
    await prisma.stockMovement.deleteMany({})

    // 10. Delete Delivery Queue
    await prisma.deliveryQueue.deleteMany({})

    // 11. Reset Product Quantity to 0
    await prisma.product.updateMany({
      data: {
        quantity: 0
      }
    })

    revalidatePath('/')
    return { success: true, message: 'All transactional data has been reset.' }
  } catch (error) {
    console.error('Reset Database Error:', error)
    return { success: false, error: 'Failed to reset database.' }
  }
}
