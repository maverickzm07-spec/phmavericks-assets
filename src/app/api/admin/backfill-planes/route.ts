import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { createOrUpdateMonthlyPlanForClient } from '@/lib/monthlyPlanUtils'

// POST /api/admin/backfill-planes
// Crea automáticamente los Planes Mensuales y Contenidos para todos los clientes
// que ya tienen un plan asignado pero no tienen Plan Mensual en el mes actual.
// Solo ejecutable por SUPER_ADMIN o ADMIN.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const clients = await prisma.client.findMany({
    where: { servicePlanId: { not: null } },
    select: { id: true, name: true, servicePlanId: true },
  })

  const results: { client: string; status: 'ok' | 'error'; detail?: string }[] = []

  for (const client of clients) {
    try {
      await createOrUpdateMonthlyPlanForClient(client.id, client.servicePlanId)
      results.push({ client: client.name, status: 'ok' })
    } catch (err: any) {
      results.push({ client: client.name, status: 'error', detail: err?.message })
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length
  const errors = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ processed: clients.length, ok, errors, results })
}
