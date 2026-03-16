
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTelur() {
  try {
    // Get the latest purchase request
    const request = await prisma.purchaseRequest.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    })

    if (!request) {
      console.log('No purchase requests found.')
      return
    }

    console.log(`Checking Request: ${request.id} (Date: ${request.requestDate})`)
    console.log(`Status: ${request.status}`)

    // Filter for items containing 'Telur'
    const telurItems = request.items.filter(item => 
      item.itemName.toLowerCase().includes('telur')
    )

    if (telurItems.length === 0) {
      console.log('No "Telur" items found in this request.')
      return
    }

    console.log('\nFound "Telur" items:')
    console.table(telurItems.map(item => ({
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      portion: item.portion,
      notes: item.notes
    })))

    // Calculate total
    const totalQty = telurItems.reduce((sum, item) => sum + item.quantity, 0)
    console.log(`\nTotal Quantity: ${totalQty}`)
    
    // Group by unit to be safe
    const byUnit = telurItems.reduce((acc, item) => {
        const u = item.unit || 'unknown'
        acc[u] = (acc[u] || 0) + item.quantity
        return acc
    }, {} as Record<string, number>)
    
    console.log('\nTotal by Unit:')
    console.table(byUnit)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTelur()
