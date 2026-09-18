import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials } from '@/lib/permissions'

export interface Alert {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
  href: string
}

const EDITING_STATUSES = ['EDITING', 'EN_PROCESO']
const DAYS_STUCK_THRESHOLD = 5
const DAYS_INGRESO_PENDING = 30

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const alerts: Alert[] = []
  const now = new Date()
  const stuckDate = new Date(now.getTime() - DAYS_STUCK_THRESHOLD * 86400000)
  const pendingDate = new Date(now.getTime() - DAYS_INGRESO_PENDING * 86400000)

  const [stuckContents, delayedProjects, delayedPlans, pendingIngresos] = await Promise.all([
    // Contenidos atascados en edición por más de X días
    prisma.content.findMany({
      where: { status: { in: EDITING_STATUSES as any[] }, updatedAt: { lte: stuckDate } },
      select: { id: true, title: true, status: true, client: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    }),

    // Proyectos atrasados
    prisma.clientProject.findMany({
      where: { estado: 'ATRASADO' },
      select: { id: true, nombre: true, client: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    }),

    // Planes mensuales atrasados
    prisma.monthlyPlan.findMany({
      where: { planStatus: 'DELAYED' },
      select: { id: true, month: true, year: true, client: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    }),

    // Ingresos pendientes/parciales de hace más de 30 días (solo admins)
    canViewFinancials(user.role)
      ? prisma.ingreso.findMany({
          where: { estadoPago: { in: ['PENDIENTE', 'PARCIAL'] }, fechaIngreso: { lte: pendingDate } },
          select: { id: true, monto: true, montoPagado: true, cliente: { select: { name: true } }, tipoServicio: true },
          orderBy: { fechaIngreso: 'asc' },
          take: 5,
        })
      : Promise.resolve([]),
  ])

  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  stuckContents.forEach((c) => {
    alerts.push({
      id: `stuck-${c.id}`,
      type: 'warning',
      title: `Contenido atascado en edición`,
      message: `"${c.title}" (${c.client?.name ?? '—'}) lleva más de ${DAYS_STUCK_THRESHOLD} días sin avanzar.`,
      href: `/contenidos/${c.id}`,
    })
  })

  delayedProjects.forEach((p) => {
    alerts.push({
      id: `proj-${p.id}`,
      type: 'danger',
      title: `Proyecto atrasado`,
      message: `"${p.nombre}" (${p.client?.name ?? '—'}) está marcado como atrasado.`,
      href: `/proyectos/${p.id}`,
    })
  })

  delayedPlans.forEach((p) => {
    alerts.push({
      id: `plan-${p.id}`,
      type: 'danger',
      title: `Plan mensual atrasado`,
      message: `Plan de ${p.client?.name ?? '—'} en ${MONTHS[(p.month ?? 1) - 1]} ${p.year} está atrasado.`,
      href: `/planes/${p.id}`,
    })
  })

  if (canViewFinancials(user.role)) {
    pendingIngresos.forEach((i) => {
      const saldo = i.monto - (i.montoPagado ?? 0)
      alerts.push({
        id: `ing-${i.id}`,
        type: 'warning',
        title: `Cobro pendiente hace +${DAYS_INGRESO_PENDING} días`,
        message: `${i.cliente?.name ?? 'Sin cliente'} — $${saldo.toLocaleString('es-MX', { minimumFractionDigits: 0 })} pendiente.`,
        href: `/ingresos`,
      })
    })
  }

  return NextResponse.json(alerts)
}
