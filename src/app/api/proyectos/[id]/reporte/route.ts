import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials, stripFinancialFields } from '@/lib/permissions'

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const project = await prisma.clientProject.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      service: true,
      monthlyPlan: { select: { id: true, month: true, year: true } },
      contents: { orderBy: { createdAt: 'asc' } },
      ingresos: {
        include: { abonos: { orderBy: { fechaAbono: 'asc' } } },
        orderBy: { fechaIngreso: 'asc' },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const entregados = project.contents.filter((c) => DONE_STATUSES.includes(c.status))
  const totalPagado = project.ingresos.reduce((sum, ingreso) => sum + ingreso.montoPagado, 0)
  const precioFinal = project.precioFinal ?? project.precioBase ?? 0
  const saldoPendiente = Math.max(0, precioFinal - totalPagado)
  const porcentajeEntrega = project.contents.length > 0
    ? Math.round((entregados.length / project.contents.length) * 100)
    : project.estado === 'COMPLETADO' ? 100 : 0

  const payload = {
    project,
    resumen: {
      totalEntregables: project.contents.length,
      entregablesCompletados: entregados.length,
      porcentajeEntrega,
      totalPagado,
      saldoPendiente,
      precioFinal,
      listoParaCerrar:
        project.estado === 'COMPLETADO' ||
        (project.contents.length > 0 && entregados.length === project.contents.length),
    },
  }

  if (canViewFinancials(user.role)) return NextResponse.json(payload)

  return NextResponse.json({
    project: stripFinancialFields(project as any),
    resumen: {
      totalEntregables: payload.resumen.totalEntregables,
      entregablesCompletados: payload.resumen.entregablesCompletados,
      porcentajeEntrega: payload.resumen.porcentajeEntrega,
      listoParaCerrar: payload.resumen.listoParaCerrar,
    },
  })
}
