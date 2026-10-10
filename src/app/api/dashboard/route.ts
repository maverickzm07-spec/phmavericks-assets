import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials } from '@/lib/permissions'
import { calcularResumenFinanciero, rangoDelMes } from '@/lib/finanzas'
import { ESTADOS_ACTIVOS } from '@/lib/projectStatus'

// Valores válidos del enum ContentStatus en la base de datos
const PENDING_STATUSES = ['PENDING', 'EDITING', 'APPROVED', 'PENDIENTE', 'EN_PROCESO']
const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

// Estados de trabajo abierto. Se toman de projectStatus para que incluyan los
// vigentes (CONFIRMADO, GRABADO) y no solo los antiguos: con la lista anterior,
// un proyecto recién confirmado no contaba como cliente activo.
const ACTIVE_PROJECT_STATES = ESTADOS_ACTIVOS

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const [
    activeClients,
    totalContents,
    pendingContents,
    completedContents,
    recentProjects,
    entregasPendientes,
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

    // Proyectos recientes
    prisma.clientProject.findMany({
      include: { client: true, contents: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),

    // Entregas pendientes: trabajos con fecha comprometida que aún no salieron.
    prisma.clientProject.count({
      where: {
        fechaEntrega: { not: null },
        estado: { notIn: ['ENTREGADO', 'COMPLETADO'] },
      },
    }),
  ])

  // Cumplimiento global: entregables completados / total entregables creados
  const avgCompliance = totalContents > 0
    ? Math.round((completedContents / totalContents) * 100)
    : 0

  const financialData: Record<string, number> = {}
  if (canViewFinancials(user.role)) {
    // Mismo helper que usa Finanzas: así las dos pantallas no pueden discrepar.
    // Antes el dashboard consultaba por su cuenta y sin límite superior de
    // fecha, de modo que un ingreso futuro inflaba el mes en una vista y no en
    // la otra.
    const { inicio, fin } = rangoDelMes()
    const resumen = await calcularResumenFinanciero(inicio, fin)

    financialData.ingresosMes = resumen.ingresosCobrados
    financialData.gastosMes = resumen.gastosPagados
    financialData.resultadoOperativo = resumen.resultadoOperativo
    financialData.porCobrar = resumen.cuentasPorCobrar
    financialData.porPagar = resumen.cuentasPorPagar
    financialData.cobrosCarteraHistorica = resumen.cobrosCarteraHistorica
  }

  return NextResponse.json({
    activeClients,
    pendingContents,
    completedContents,
    avgCompliance,
    recentProjects,
    entregasPendientes,
    totalContents,
    ...financialData,
  })
}
