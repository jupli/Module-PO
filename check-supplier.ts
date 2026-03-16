
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSuppliers() {
  console.log('Checking Suppliers...')
  
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  })
  
  console.log(`Total Suppliers: ${suppliers.length}`)
  console.table(suppliers.map(s => ({
    id: s.id,
    name: s.name,
    products: 0 // Placeholder, we can count if needed
  })))

  // Also check product assignments
  const products = await prisma.product.findMany({
    where: {
      name: {
        in: [
          'kara', 'daun pandan', 'jahe', 'ladaku', 'chicken powder', 
          'Susu Ultramilk Plain Biru', 'Telur', 'seledri', 'kacang hijau', 
          'Tahu', 'tomat', 'kembang kol frozen', 'cabe merah', 'Anggur', 
          'Roti sosis', 'Roti abon', 'Bakpau', 'Bakpia'
        ]
      }
    },
    include: {
      supplier: true
    }
  })

  console.log('\nProduct Supplier Assignments:')
  console.table(products.map(p => ({
    name: p.name,
    supplier: p.supplier?.name || 'Unassigned (General)',
    category: p.category
  })))
}

checkSuppliers()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
