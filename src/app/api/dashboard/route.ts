import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { calculateCompliance } from '@/lib/utils'

// Valores válidos del enum ContentStatus en la base de datos
const PENDING_STATUSES = ['PENDING', 'EDITING', 'APPROVED', 'PENDIENTE', 'EN_PROCESO']
const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

// Estados de proyecto que se consideran "trabajo activo"
const ACTIVE_PROJECT_STATES = ['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const [activeClients, totalContents, pendingContents, completedContents, allPlans] = await Promise.all([
    // Clientes con plan mensual en curso O proyecto activo
    prisma.client.count({
      where: {
        OR: [
          { monthlyPlans: { some: { planStatus: 'IN_PROGRESS' } } },
          { projects: { some: { estado: { in: ACTIVE_PROJECT_STATES as any[] } } } },
        ],
      },
    }),

    // Total de entregables (planes + proyectos) para calcular cumplimiento global
    prisma.content.count(),

    // Pendientes: todos los entregables no completados (planes + proyectos)
    prisma.content.count({
      where: { status: { in: PENDING_STATUSES as any[] } },
    }),

    // Entregados/completados: todos (planes + proyectos)
    prisma.content.count({
      where: { status: { in: DONE_STATUSES as any[] } },
    }),

    // Planes mensuales: para completados, atrasados y tabla reciente
    prisma.monthlyPlan.findMany({
      include: { client: true, contents: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 20,
    }),
  ])

  const completedPlans = allPlans.filter((p) => p.planStatus === 'COMPLETED').length
  const delayedPlans = allPlans.filter((p) => p.planStatus === 'DELAYED').length

  // Cumplimiento global: entregables completados / total entregables creados
  const avgCompliance = totalContents > 0
    ? Math.round((completedContents / totalContents) * 100)
    : 0

  // Últimos 6 planes para la tabla del dashboard
  const recentPlans = allPlans.slice(0, 6)

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
    totalContents,
  })
}
