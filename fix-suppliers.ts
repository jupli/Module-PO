
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration...')

  // 1. Ensure Suppliers exist
  const suppliersToCheck = [
    { name: 'General Supplier' },
    { name: 'Supplier Beras' },
    { name: 'Supplier Daging Ayam' }
  ]

  const supplierMap: Record<string, string> = {}

  for (const s of suppliersToCheck) {
    let supplier = await prisma.supplier.findFirst({ where: { name: s.name } })
    if (!supplier) {
      console.log(`Creating supplier: ${s.name}`)
      supplier = await prisma.supplier.create({ data: s })
    }
    supplierMap[s.name] = supplier.id
  }

  // 2. Link Products to Suppliers
  // Map Product Name -> Supplier Name
  const productSupplierMap: Record<string, string> = {
    'Beras': 'Supplier Beras',
    'Ayam potong': 'Supplier Daging Ayam'
  }

  for (const [prodName, suppName] of Object.entries(productSupplierMap)) {
    const product = await prisma.product.findFirst({ 
      where: { 
        OR: [
          { name: { contains: prodName } },
          { name: prodName }
        ]
      } 
    })

    if (product) {
      console.log(`Linking product ${product.name} to ${suppName}`)
      await prisma.product.update({
        where: { id: product.id },
        // @ts-ignore
        data: { supplierId: supplierMap[suppName] }
      })
    } else {
      console.log(`Product not found: ${prodName}`)
    }
  }

  // 3. Fix existing POs under General Supplier
  const generalSupplierId = supplierMap['General Supplier']
  
  const generalPOs = await prisma.purchaseOrder.findMany({
    where: { supplierId: generalSupplierId, status: 'PENDING' },
    include: { items: { include: { product: true } } }
  })

  for (const po of generalPOs) {
    console.log(`Processing PO: ${po.poNumber}`)
    
    // Group items by their CORRECT supplier
    const itemsBySupplier: Record<string, typeof po.items> = {}
    
    for (const item of po.items) {
      const correctSupplierId = item.product.supplierId || generalSupplierId
      
      if (correctSupplierId !== generalSupplierId) {
        if (!itemsBySupplier[correctSupplierId]) {
          itemsBySupplier[correctSupplierId] = []
        }
        itemsBySupplier[correctSupplierId].push(item)
      }
    }

    // For each new supplier group, create a new PO and move items
    for (const [newSupplierId, items] of Object.entries(itemsBySupplier)) {
      const supplier = await prisma.supplier.findUnique({ where: { id: newSupplierId } })
      if (!supplier) continue

      console.log(`  Moving ${items.length} items to new PO for ${supplier.name}`)

      // Create new PO
      const count = await prisma.purchaseOrder.count()
      // Use a random suffix to avoid collision if run quickly
      const poNumber = `PO-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}-${supplier.name.substring(0, 3).toUpperCase()}`
      
      const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0)

      const newPO = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: newSupplierId,
          date: po.date,
          status: po.status,
          totalAmount
        }
      })

      // Move items
      for (const item of items) {
        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: { purchaseOrderId: newPO.id }
        })
      }
      
      // Update old PO total amount
      // (Simplified: We should recalculate old PO total or delete it if empty)
    }

    // Cleanup: Check if old PO is empty
    const remainingItems = await prisma.purchaseOrderItem.count({ where: { purchaseOrderId: po.id } })
    if (remainingItems === 0) {
      console.log(`  Deleting empty PO ${po.poNumber}`)
      await prisma.purchaseOrder.delete({ where: { id: po.id } })
    } else {
      // Recalculate total
      const currentItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } })
      const newTotal = currentItems.reduce((sum: number, item: any) => sum + item.total, 0)
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { totalAmount: newTotal }
      })
    }
  }

  console.log('Migration done.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
