import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { calculateCompliance } from '@/lib/utils'

const PENDING_STATUSES = ['PENDING', 'EDITING', 'APPROVED', 'PENDIENTE', 'EN_PROCESO', 'EN_EDICION']
const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const [activeClients, pendingContents, completedContents, allPlans, allProjects] = await Promise.all([
    // Clientes con al menos un trabajo/plan activo
    prisma.client.count({
      where: {
        OR: [
          { status: 'ACTIVE' },
          { projects: { some: { estado: { in: ['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO'] } } } },
        ],
      },
    }),
    // Pendientes: planes mensuales + proyectos ocasionales
    prisma.content.count({ where: { status: { in: PENDING_STATUSES as any[] } } }),
    // Entregados/completados: todos
    prisma.content.count({ where: { status: { in: DONE_STATUSES as any[] } } }),
    // Planes mensuales recientes para compliance
    prisma.monthlyPlan.findMany({
      include: { contents: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 20,
    }),
    // Proyectos ocasionales para compliance adicional
    prisma.clientProject.findMany({
      include: { contents: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const completedPlans = allPlans.filter((p) => p.planStatus === 'COMPLETED').length
  const delayedPlans = allPlans.filter((p) => p.planStatus === 'DELAYED').length

  // Compliance de planes mensuales
  const planCompliances = allPlans.map((p) => calculateCompliance(p, p.contents))

  // Compliance de proyectos ocasionales
  const projectCompliances = allProjects
    .filter((p) => p.contents.length > 0)
    .map((p) => {
      const total = p.contents.length
      const done = p.contents.filter((c) => DONE_STATUSES.includes(c.status)).length
      return total > 0 ? (done / total) * 100 : 0
    })

  const allCompliances = [
    ...planCompliances.map((c) => c.compliancePercentage),
    ...projectCompliances,
  ]

  const avgCompliance =
    allCompliances.length > 0
      ? Math.round(allCompliances.reduce((sum, c) => sum + c, 0) / allCompliances.length)
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
