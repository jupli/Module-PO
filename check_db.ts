
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Connecting to database...')
    await prisma.$connect()
    console.log('Connected successfully!')
    
    const count = await prisma.purchaseRequest.count()
    console.log(`PurchaseRequest count: ${count}`)
    
  } catch (e) {
    console.error('Connection failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
