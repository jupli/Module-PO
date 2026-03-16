
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database reset...')

  // 1. Clear Transactional Data (Reverse dependency order)
  
  // Goods Receipt
  console.log('Deleting GoodsReceiptItems...')
  await prisma.goodsReceiptItem.deleteMany({})
  console.log('Deleting GoodsReceipts...')
  await prisma.goodsReceipt.deleteMany({})

  // Payments
  console.log('Deleting PurchasePayments...')
  await prisma.purchasePayment.deleteMany({})

  // Purchase Order Items
  console.log('Deleting PurchaseOrderItems...')
  await prisma.purchaseOrderItem.deleteMany({})

  // Purchase Orders
  console.log('Deleting PurchaseOrders...')
  await prisma.purchaseOrder.deleteMany({})

  // Stock Movements
  console.log('Deleting StockMovements...')
  await prisma.stockMovement.deleteMany({})

  // Recipes (Derived from requests)
  console.log('Deleting RecipeItems...')
  await prisma.recipeItem.deleteMany({})
  console.log('Deleting Recipes...')
  await prisma.recipe.deleteMany({})

  // Purchase Request Items
  console.log('Deleting PurchaseRequestItems...')
  await prisma.purchaseRequestItem.deleteMany({})

  // Purchase Requests
  console.log('Deleting PurchaseRequests...')
  await prisma.purchaseRequest.deleteMany({})
  
  // Delivery Queue
  console.log('Deleting DeliveryQueue...')
  await prisma.deliveryQueue.deleteMany({})

  // 2. Reset Product Stock
  console.log('Resetting Product quantities to 0...')
  await prisma.product.updateMany({
    data: {
      quantity: 0
    }
  })

  console.log('Database reset completed successfully.')
}

main()
  .catch((e) => {
    console.error('Error during reset:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
