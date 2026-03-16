import { prisma } from './src/lib/prisma'

async function fixBeneficiaryData() {
  console.log('Starting Beneficiary Data Fix...')

  // 1. Fix SMP KANISIUS WONOSARI (Total 122)
  // Should be PM PAKET BASAH, Portion Large 122, Small 0
  const smpKanisius = await prisma.beneficiary.updateMany({
    where: {
      name: 'SMP KANISIUS WONOSARI',
      total: 122,
      category: 'Bumil/Balita' // Currently wrong category
    },
    data: {
      category: 'PM PAKET BASAH',
      portionLarge: 122,
      portionSmall: 0
    }
  })
  console.log('Fixed SMP KANISIUS WONOSARI:', smpKanisius.count)

  // 2. Fix SMK N 2 WONOSARI (Total 1220)
  // Should be PM PAKET BASAH, Portion Large 1220, Small 0
  const smkN2 = await prisma.beneficiary.updateMany({
    where: {
      name: 'SMK N 2 WONOSARI',
      total: 1220,
      category: 'Bumil/Balita' // Currently wrong category
    },
    data: {
      category: 'PM PAKET BASAH',
      portionLarge: 1220,
      portionSmall: 0
    }
  })
  console.log('Fixed SMK N 2 WONOSARI:', smkN2.count)

  // 3. Fix MTS AL IHTISAM (Total 115)
  // Should be PM PAKET KERING, Portion Large 115, Small 0
  // Note: User table says "Porsi Besar" is 115, but let's double check.
  // User input: "MTS AL IHTISAM 115 0 115" (Total 115, Kecil 0, Besar 115)
  // So yes, portionLarge should be 115.
  const mtsAlIhtisam = await prisma.beneficiary.updateMany({
    where: {
      name: 'MTS AL IHTISAM',
      total: 115,
      category: 'Bumil/Balita' // Currently wrong category
    },
    data: {
      category: 'PM PAKET KERING',
      portionLarge: 115,
      portionSmall: 0
    }
  })
  console.log('Fixed MTS AL IHTISAM (115):', mtsAlIhtisam.count)

  // 4. Verify REJOSARI, GEDANGSARI, PURWOSARI are correct (Bumil/Balita)
  // They seem correct in check-beneficiary.ts output:
  // REJOSARI: Small 16, Large 20. User: Bumil 16, Balita 20. Correct if Small=Bumil.
  // GEDANGSARI: Small 22, Large 25. User: Bumil 22, Balita 25. Correct.
  // PURWOSARI: Small 8, Large 19. User: Bumil 8, Balita 19. Correct.

  console.log('Data Fix Completed.')
}

fixBeneficiaryData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
