import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// Valores válidos del enum ContentStatus en la base de datos
const PENDING_STATUSES = ['PENDING', 'EDITING', 'APPROVED', 'PENDIENTE', 'EN_PROCESO']
const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

// Estados de proyecto que se consideran "trabajo activo"
const ACTIVE_PROJECT_STATES = ['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const [
    activeClients,
    totalContents,
    pendingContents,
    completedContents,
    allPlans,
    completedProjects,
    delayedProjects,
    recentProjects,
  ] = await Promise.all([
    // Clientes con plan mensual en curso O proyecto activo
    prisma.client.count({
      where: {
        OR: [
          { monthlyPlans: { some: { planStatus: 'IN_PROGRESS' } } },
          { projects: { some: { estado: { in: ACTIVE_PROJECT_STATES as any[] } } } },
        ],
      },
    }),

    // Total de entregables para calcular cumplimiento global
    prisma.content.count(),

    // Pendientes: todos los entregables no completados
    prisma.content.count({
      where: { status: { in: PENDING_STATUSES as any[] } },
    }),

    // Entregados/completados
    prisma.content.count({
      where: { status: { in: DONE_STATUSES as any[] } },
    }),

    // Planes mensuales recientes
    prisma.monthlyPlan.findMany({
      include: { client: true, contents: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 20,
    }),

    // Proyectos completados
    prisma.clientProject.count({ where: { estado: 'COMPLETADO' } }),

    // Proyectos atrasados
    prisma.clientProject.count({ where: { estado: 'ATRASADO' } }),

    // Proyectos recientes
    prisma.clientProject.findMany({
      include: { client: true, contents: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ])

  // Conteos unificados: planes mensuales + proyectos ocasionales
  const completedPlans = allPlans.filter((p) => p.planStatus === 'COMPLETED').length + completedProjects
  const delayedPlans = allPlans.filter((p) => p.planStatus === 'DELAYED').length + delayedProjects

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
    recentProjects,
    ingresosMes,
    totalContents,
  })
}
