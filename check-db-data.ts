import { prisma } from './src/lib/prisma'

async function checkData() {
  const dateStr = '2026-01-12'
  const startOfDay = new Date(dateStr)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(dateStr)
  endOfDay.setHours(23, 59, 59, 999)

  console.log('Checking for date:', dateStr)
  console.log('Start:', startOfDay.toISOString())
  console.log('End:', endOfDay.toISOString())

  const beneficiaries = await prisma.beneficiary.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  })
  console.log('Beneficiaries count:', beneficiaries.length)
  if (beneficiaries.length > 0) {
    console.log('Sample Beneficiary:', beneficiaries[0])
  }

  const requestItems = await prisma.purchaseRequestItem.findMany({
    where: {
      purchaseRequest: {
        requestDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    },
    include: {
      purchaseRequest: true
    }
  })
  console.log('Request Items count:', requestItems.length)
  if (requestItems.length > 0) {
    console.log('Sample Item:', requestItems[0])
  } else {
    // Check if ANY items exist at all
    const allItems = await prisma.purchaseRequestItem.count()
    console.log('Total items in DB:', allItems)
    
    // Check if ANY requests exist at all
    const allRequests = await prisma.purchaseRequest.count()
    console.log('Total requests in DB:', allRequests)
  }
}

checkData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
