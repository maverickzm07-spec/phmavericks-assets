import { PrismaClient } from '@prisma/client'
import { createOrUpdateMonthlyPlanForClient } from '../lib/monthlyPlanUtils'

const prisma = new PrismaClient()

async function main() {
  const clients = await prisma.client.findMany({
    where: { servicePlanId: { not: null } },
    select: { id: true, name: true, servicePlanId: true },
  })

  console.log(`Procesando ${clients.length} cliente(s) con plan asignado...`)

  for (const c of clients) {
    try {
      await createOrUpdateMonthlyPlanForClient(c.id, c.servicePlanId)
      console.log(`  ✓ ${c.name}`)
    } catch (err: any) {
      console.error(`  ✗ ${c.name}: ${err.message}`)
    }
  }

  await prisma.$disconnect()
  console.log('Backfill completado.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
