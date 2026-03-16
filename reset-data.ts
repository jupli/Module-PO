
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetData() {
  console.log('⚠️  Starting FULL DATA RESET for Purchase Orders and related transactions...')
  
  try {
    // 1. Clear Downstream Transactions (Delivery, Stock, Recipes)
    console.log('1. Clearing Delivery Queue...')
    await prisma.deliveryQueue.deleteMany({})

    console.log('2. Clearing Stock Movements & Resetting Product Quantities...')
    await prisma.stockMovement.deleteMany({})
    await prisma.product.updateMany({
      data: { quantity: 0 }
    })

    console.log('3. Clearing Recipes...')
    await prisma.recipeItem.deleteMany({})
    await prisma.recipe.deleteMany({})

    // 2. Clear Purchase Cycle (GR -> PO -> PR)
    console.log('4. Clearing Goods Receipts...')
    await prisma.goodsReceiptItem.deleteMany({})
    await prisma.goodsReceipt.deleteMany({})

    console.log('5. Clearing Purchase Payments...')
    await prisma.purchasePayment.deleteMany({})

    console.log('6. Clearing Purchase Orders...')
    await prisma.purchaseOrderItem.deleteMany({})
    await prisma.purchaseOrder.deleteMany({})

    console.log('7. Clearing Purchase Requests...')
    await prisma.purchaseRequestItem.deleteMany({})
    await prisma.purchaseRequest.deleteMany({})

    // Optional: Clear Beneficiaries if "Input dari awal" implies new Excel with school data
    // But usually this is Master Data. I'll keep it for now unless requested, 
    // or maybe I should ask? 
    // User said "DATA-DATA PURCHASE ORDERS", but "INPUT DATA DARI AWAL".
    // Safest is to keep Beneficiaries (Master Data-ish) but clear transactions.
    
    console.log('✅  Data Reset Complete!')
    console.log('   - Purchase Orders: DELETED')
    console.log('   - Purchase Requests: DELETED')
    console.log('   - Goods Receipts: DELETED')
    console.log('   - Payments: DELETED')
    console.log('   - Stock & Delivery: CLEARED')
    console.log('   - Product Quantities: RESET to 0')
    
  } catch (error) {
    console.error('❌ Error during reset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetData()
