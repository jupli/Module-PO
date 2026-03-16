const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const username = 'admin'
  const password = '12345' // Password default

  console.log(`Seeding user: ${username}...`)

  const user = await prisma.user.upsert({
    where: { username },
    update: {}, // Jika sudah ada, biarkan saja
    create: {
      username,
      password,
    },
  })

  console.log('User created/updated:', user)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
