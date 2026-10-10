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
/** Ventana de aviso para grabaciones, sesiones y entregas próximas. */
const DIAS_PROXIMOS = 7

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const alerts: Alert[] = []
  const now = new Date()
  const stuckDate = new Date(now.getTime() - DAYS_STUCK_THRESHOLD * 86400000)
  const pendingDate = new Date(now.getTime() - DAYS_INGRESO_PENDING * 86400000)

  const limiteProximos = new Date(now.getTime() + DIAS_PROXIMOS * 86400000)

  const [stuckContents, delayedProjects, pendingIngresos, eventosProximos, entregasPendientes] = await Promise.all([
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

    // Ingresos pendientes/parciales de hace más de 30 días (solo admins)
    canViewFinancials(user.role)
      ? prisma.ingreso.findMany({
          where: { estadoPago: { in: ['PENDIENTE', 'PARCIAL'] }, fechaIngreso: { lte: pendingDate } },
          select: { id: true, monto: true, montoPagado: true, cliente: { select: { name: true } }, tipoServicio: true },
          orderBy: { fechaIngreso: 'asc' },
          take: 5,
        })
      : Promise.resolve([]),

    // Grabaciones, sesiones y eventos de los próximos días
    prisma.calendarEvent.findMany({
      where: {
        status: 'AGENDADO',
        startDateTime: { gte: now, lte: limiteProximos },
      },
      select: { id: true, title: true, type: true, startDateTime: true, clientName: true },
      orderBy: { startDateTime: 'asc' },
      take: 5,
    }),

    // Entregas comprometidas que vencen pronto y aún no están entregadas
    prisma.clientProject.findMany({
      where: {
        fechaEntrega: { gte: now, lte: limiteProximos },
        estado: { notIn: ['ENTREGADO', 'COMPLETADO'] },
      },
      select: { id: true, nombre: true, fechaEntrega: true, client: { select: { name: true } } },
      orderBy: { fechaEntrega: 'asc' },
      take: 5,
    }),
  ])

  const formatoFecha = (d: Date) => d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })

  const ETIQUETA_EVENTO: Record<string, string> = {
    GRABACION: 'Grabación',
    SESION_FOTOGRAFICA: 'Sesión fotográfica',
    REUNION: 'Reunión',
    ENTREGA: 'Entrega',
    EDICION: 'Edición',
    EVENTO: 'Evento',
    OTRO: 'Actividad',
  }

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

  // Recordatorios de agenda: lo que viene en los próximos días.
  eventosProximos.forEach((ev) => {
    alerts.push({
      id: `evento-${ev.id}`,
      type: 'info',
      title: `${ETIQUETA_EVENTO[ev.type] ?? 'Actividad'} el ${formatoFecha(ev.startDateTime)}`,
      message: `${ev.title}${ev.clientName ? ` · ${ev.clientName}` : ''}`,
      href: '/calendario',
    })
  })

  // Entregas comprometidas que se acercan y el trabajo aún no ha salido.
  entregasPendientes.forEach((p) => {
    alerts.push({
      id: `entrega-${p.id}`,
      type: 'warning',
      title: `Entrega pendiente el ${p.fechaEntrega ? formatoFecha(p.fechaEntrega) : 'próximamente'}`,
      message: `"${p.nombre}" (${p.client?.name ?? '—'}) todavía no está entregado.`,
      href: `/proyectos/${p.id}`,
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
