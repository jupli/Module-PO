
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const username = 'admin'
  const password = '12345' // In production, hash this!

  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      password,
    },
  })

  console.log({ user })
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
