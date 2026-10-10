import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents, canDeleteData, canViewFinancials, stripFinancialFields } from '@/lib/permissions'
import { ESTADOS_PROYECTO } from '@/lib/projectStatus'
import { sincronizarEventosProyecto } from '@/lib/eventosProyecto'
import { logAudit } from '@/lib/auditLog'
import { z } from 'zod'

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  modalidad: z.enum(['MENSUAL', 'OCASIONAL']).optional(),
  estado: z.enum(ESTADOS_PROYECTO).optional(),
  serviceId: z.string().nullable().optional(),
  monthlyPlanId: z.string().nullable().optional(),
  linkEntrega: z.string().url().optional().or(z.literal('')),
  driveLink: z.string().url().optional().or(z.literal('')),
  fechaGrabacion: z.string().nullable().optional(),
  fechaEntrega: z.string().nullable().optional(),
  mensajeEntrega: z.string().nullable().optional(),
  observaciones: z.string().optional(),
  precioBase: z.number().min(0).optional().nullable(),
  precioFinal: z.number().min(0).optional().nullable(),
})

/** Ver nota en POST /api/proyectos: fija una fecha suelta a mediodía. */
function normalizarFecha(valor?: string | null): Date | null | undefined {
  if (valor === undefined) return undefined
  if (valor === null || valor === '') return null
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  const fecha = new Date(soloFecha ? `${valor}T12:00:00` : valor)
  return isNaN(fecha.getTime()) ? undefined : fecha
}

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const project = await prisma.clientProject.findUnique({
    where: { id: params.id },
    include: {
      // whatsapp y email: hacen falta para compartir la entrega con el cliente
      client: { select: { id: true, name: true, business: true, whatsapp: true, email: true } },
      service: { select: { id: true, nombre: true, tipo: true, modalidad: true, precio: true } },
      monthlyPlan: { select: { id: true, month: true, year: true } },
      ingresos: {
        include: { abonos: { orderBy: { fechaAbono: 'asc' } } },
        orderBy: { fechaIngreso: 'asc' },
      },
      contents: {
        orderBy: { createdAt: 'asc' },
        include: { client: { select: { id: true, name: true } } },
      },
      deliveryAccesses: { orderBy: { createdAt: 'desc' }, take: 1 },
      gastos: {
        include: { categoria: { select: { id: true, nombre: true } } },
        orderBy: { fecha: 'desc' },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  const totalPagado = project.ingresos.reduce((s, i) => s + i.montoPagado, 0)
  const saldoPendiente = project.precioFinal != null ? Math.max(0, project.precioFinal - totalPagado) : null
  const estadoEconomico = project.precioFinal == null ? 'SIN_PRECIO'
    : totalPagado <= 0 ? 'SIN_PAGO'
    : totalPagado >= project.precioFinal ? 'PAGADO'
    : 'ABONADO'

  // Rentabilidad: se separan la lectura de caja (lo cobrado menos lo pagado) y
  // el margen teórico sobre el valor contratado. No son lo mismo y mezclarlas
  // haría pasar dinero pendiente por efectivo disponible.
  const redondear = (n: number) => Math.round(n * 100) / 100
  const totalGastos = project.gastos.reduce((s, g) => s + g.monto, 0)
  const gastosPagados = project.gastos.filter((g) => g.estado === 'PAGADO').reduce((s, g) => s + g.monto, 0)

  const rentabilidad = {
    contratado: project.precioFinal != null ? redondear(project.precioFinal) : null,
    cobrado: redondear(totalPagado),
    saldoPendiente,
    gastos: redondear(totalGastos),
    gastosPagados: redondear(gastosPagados),
    gastosPorPagar: redondear(totalGastos - gastosPagados),
    resultadoCaja: redondear(totalPagado - gastosPagados),
    margenSobreContratado: project.precioFinal != null ? redondear(project.precioFinal - totalGastos) : null,
  }

  const enriched = { ...project, totalPagado, saldoPendiente, estadoEconomico, rentabilidad }
  return NextResponse.json(canViewFinancials(user.role) ? enriched : stripFinancialFields(enriched))
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existingProject = await prisma.clientProject.findUnique({
      where: { id: params.id },
      select: { id: true, clientId: true },
    })
    if (!existingProject) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    if (data.serviceId) {
      const service = await prisma.servicePlan.findUnique({ where: { id: data.serviceId }, select: { id: true } })
      if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }
    if (data.monthlyPlanId) {
      const monthlyPlan = await prisma.monthlyPlan.findUnique({
        where: { id: data.monthlyPlanId },
        select: { id: true, clientId: true },
      })
      if (!monthlyPlan) return NextResponse.json({ error: 'Plan mensual no encontrado' }, { status: 404 })
      if (monthlyPlan.clientId !== existingProject.clientId) {
        return NextResponse.json({ error: 'El plan mensual pertenece a otro cliente' }, { status: 400 })
      }
    }

    const project = await prisma.clientProject.update({
      where: { id: params.id },
      data: {
        ...data,
        // Si el campo no viene en la petición, conservar el link actual.
        // Antes `undefined || null` convertía cualquier cambio parcial (por ejemplo, estado)
        // en `linkEntrega = null`, borrando el enlace de Drive accidentalmente.
        linkEntrega: data.linkEntrega === undefined ? undefined : (data.linkEntrega || null),
        driveLink: data.driveLink === undefined ? undefined : (data.driveLink || null),
        fechaEntrega: normalizarFecha(data.fechaEntrega),
        fechaGrabacion: normalizarFecha(data.fechaGrabacion),
        estado: data.estado as any,
        serviceId: data.serviceId === undefined ? undefined : (data.serviceId || null),
        monthlyPlanId: data.monthlyPlanId === undefined ? undefined : (data.monthlyPlanId || null),
      },
      include: {
        client: { select: { id: true, name: true, business: true } },
        service: { select: { id: true, nombre: true, tipo: true } },
        contents: true,
      },
    })

    // Si cambiaron las fechas, el calendario debe seguirlas. Antes los eventos
    // solo se creaban al dar de alta el proyecto y quedaban desfasados al editarlo.
    if (data.fechaGrabacion !== undefined || data.fechaEntrega !== undefined || data.nombre !== undefined) {
      await sincronizarEventosProyecto(project.id, project.nombre, project.clientId, {
        fechaGrabacion: project.fechaGrabacion,
        fechaEntrega: project.fechaEntrega,
      })
    }

    // Al cerrar el proyecto (ENTREGADO en el flujo vigente, COMPLETADO en el
    // anterior) se dan por entregados los entregables que quedaran pendientes.
    if (data.estado === 'ENTREGADO' || data.estado === 'COMPLETADO') {
      const pending = project.contents.filter((c) => !DONE_STATUSES.includes(c.status))
      if (pending.length > 0) {
        // Actualizar entregables pendientes a ENTREGADO automáticamente
        await prisma.content.updateMany({
          where: { projectId: params.id, status: { notIn: DONE_STATUSES as any[] } },
          data: { status: 'ENTREGADO' },
        })
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canDeleteData(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // Se lee antes de borrar para dejar constancia de qué se eliminó.
  const proyecto = await prisma.clientProject.findUnique({
    where: { id: params.id },
    select: { id: true, nombre: true, precioFinal: true, estado: true, client: { select: { name: true } } },
  })
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  // Los contenidos del proyecto se desvinculan (SetNull en schema)
  await prisma.clientProject.delete({ where: { id: params.id } })

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    action: 'PROYECTO_ELIMINADO',
    entity: 'ClientProject',
    entityId: params.id,
    before: {
      nombre: proyecto.nombre,
      cliente: proyecto.client?.name ?? null,
      precioFinal: proyecto.precioFinal,
      estado: proyecto.estado,
    },
  })

  return NextResponse.json({ success: true })
}
