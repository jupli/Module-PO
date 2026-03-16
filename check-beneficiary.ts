import { prisma } from './src/lib/prisma'

async function checkBeneficiaryData() {
  const beneficiaries = await prisma.beneficiary.findMany({
    take: 20,
    orderBy: {
      date: 'desc'
    }
  })
  
  console.log('Total Beneficiaries:', beneficiaries.length)
  console.log('Sample Data:', JSON.stringify(beneficiaries, null, 2))
}

checkBeneficiaryData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
