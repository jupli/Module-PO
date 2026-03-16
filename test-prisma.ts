
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing Prisma Client schema...')
    // Intentionally try to include payments to see if it validates
    // We don't need to actually run the query, just instantiate the query object
    // But since findMany is async and validation happens at runtime call...
    
    // Let's just inspect the dmmf if possible, or try a count
    // Actually, running a query is the best test.
    
    const count = await prisma.purchaseOrder.count()
    console.log(`PO Count: ${count}`)
    
    // Now try to query with include payments
    const po = await prisma.purchaseOrder.findFirst({
        include: {
            payments: true
        }
    })
    console.log('Query with payments successful')
    
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
