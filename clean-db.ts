
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('Starting database cleanup...')
  
  try {
    // 1. Reset Product Quantities and Delete Stock Movements
    console.log('Clearing Stock Movements and resetting Product quantities...')
    await prisma.stockMovement.deleteMany({})
    await prisma.product.updateMany({
      data: { quantity: 0 }
    })
    
    // 2. Delete Goods Receipts (and items via cascade or explicit)
    console.log('Clearing Goods Receipts...')
    // Delete items first just to be safe, though cascade might handle it
    await prisma.goodsReceiptItem.deleteMany({}) 
    await prisma.goodsReceipt.deleteMany({})
    
    // 3. Delete Purchase Orders (and items via cascade or explicit)
    console.log('Clearing Purchase Orders...')
    await prisma.purchaseOrderItem.deleteMany({})
    await prisma.purchaseOrder.deleteMany({})
    
    // 4. Delete Purchase Requests (and items via cascade or explicit)
    console.log('Clearing Purchase Requests...')
    await prisma.purchaseRequestItem.deleteMany({})
    await prisma.purchaseRequest.deleteMany({})
    
    console.log('✅ Database cleanup completed successfully.')
    console.log('Ready for fresh Excel upload.')
    
  } catch (error) {
    console.error('Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()
