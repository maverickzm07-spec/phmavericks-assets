import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { calculateCompliance } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const [activeClients, pendingContents, completedContents, allPlans] = await Promise.all([
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.content.count({ where: { status: { in: ['PENDING', 'EDITING', 'APPROVED'] } } }),
    prisma.content.count({ where: { status: { in: ['PUBLISHED', 'COMPLETED'] } } }),
    prisma.monthlyPlan.findMany({
      include: { contents: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 20,
    }),
  ])

  const completedPlans = allPlans.filter((p) => p.planStatus === 'COMPLETED').length
  const delayedPlans = allPlans.filter((p) => p.planStatus === 'DELAYED').length

  const compliances = allPlans.map((p) => calculateCompliance(p, p.contents))
  const avgCompliance =
    compliances.length > 0
      ? Math.round(compliances.reduce((sum, c) => sum + c.compliancePercentage, 0) / compliances.length)
      : 0

  const recentPlans = await prisma.monthlyPlan.findMany({
    include: { client: true, contents: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 6,
  })

  const now = new Date()
  const mesStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ingresosMesData = await prisma.ingreso.findMany({
    where: { fechaIngreso: { gte: mesStart }, estadoPago: { not: 'PENDIENTE' } },
    select: { montoPagado: true },
  })
  const ingresosMes = ingresosMesData.reduce((s, i) => s + (i.montoPagado || 0), 0)

  return NextResponse.json({
    activeClients,
    pendingContents,
    completedContents,
    completedPlans,
    delayedPlans,
    avgCompliance,
    recentPlans,
    ingresosMes,
  })
}
