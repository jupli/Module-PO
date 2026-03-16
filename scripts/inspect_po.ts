
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const poNumber = 'PO-20260308-SUP-397'
  const po = await prisma.purchaseOrder.findUnique({
    where: { poNumber },
    include: { items: true }
  })
  
  if (!po) {
    console.log('PO not found')
    return
  }
  
  console.log('Original PO:', {
    poNumber: po.poNumber,
    totalAmount: po.totalAmount,
    items: po.items
  })
  
  const returnPoNumber = poNumber.replace('PO-', 'PO-RET-')
  const returnPo = await prisma.purchaseOrder.findUnique({
    where: { poNumber: returnPoNumber },
    include: { items: true }
  })
  
  if (returnPo) {
    console.log('Return PO:', {
        poNumber: returnPo.poNumber,
        totalAmount: returnPo.totalAmount,
        items: returnPo.items
    })
  } else {
    // Try to find by similar suffix if naming convention is different
    const relatedReturns = await prisma.purchaseOrder.findMany({
        where: { poNumber: { contains: '-RET-' } }
    })
    console.log('All Return POs:', relatedReturns.map(r => r.poNumber))
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
