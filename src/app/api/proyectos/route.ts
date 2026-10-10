import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents, canViewFinancials, stripFinancialFields } from '@/lib/permissions'
import { ESTADOS_PROYECTO } from '@/lib/projectStatus'
import { sincronizarEventosProyecto } from '@/lib/eventosProyecto'
import { z } from 'zod'

/**
 * Una fecha de formulario llega como AAAA-MM-DD. Interpretada tal cual queda en
 * medianoche UTC, que en Ecuador (UTC−5) es el día anterior. Se fija a mediodía
 * para que el día sea el mismo en ambos husos.
 */
function normalizarFecha(valor?: string | null): Date | null {
  if (!valor) return null
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  const fecha = new Date(soloFecha ? `${valor}T12:00:00` : valor)
  return isNaN(fecha.getTime()) ? null : fecha
}

const VALID_CONTENT_TYPES = ['REEL', 'CAROUSEL', 'FLYER', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA', 'VIDEO', 'OTRO'] as const
const VALID_FORMATS = ['VERTICAL_9_16', 'HORIZONTAL_16_9', 'CUADRADO_1_1', 'NO_APLICA'] as const

const createSchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  serviceId: z.string().nullable().optional(),
  monthlyPlanId: z.string().nullable().optional(),
  nombre: z.string().min(1, 'El nombre del proyecto es obligatorio'),
  descripcion: z.union([z.string(), z.null()]).optional(),
  modalidad: z.enum(['MENSUAL', 'OCASIONAL'], { errorMap: () => ({ message: 'Modalidad inválida' }) }).default('OCASIONAL'),
  estado: z.enum(ESTADOS_PROYECTO).default('CONFIRMADO'),
  linkEntrega: z.union([z.string().url('El link de entrega debe ser una URL válida'), z.literal(''), z.null()]).optional(),
  driveLink: z.union([z.string().url('El enlace de Drive debe ser una URL válida'), z.literal(''), z.null()]).optional(),
  fechaGrabacion: z.union([z.string(), z.null()]).optional(),
  fechaEntrega: z.union([z.string(), z.null()]).optional(),
  mensajeEntrega: z.union([z.string(), z.null()]).optional(),
  observaciones: z.union([z.string(), z.null()]).optional(),
  precioBase: z.number().min(0).optional().nullable(),
  precioFinal: z.number().min(0).optional().nullable(),
  abono: z.number().min(0).optional().nullable(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  observacionPago: z.string().optional().nullable(),
  entregables: z.array(z.object({
    type: z.enum(VALID_CONTENT_TYPES, { errorMap: () => ({ message: 'Tipo de contenido inválido' }) }),
    formato: z.enum(VALID_FORMATS).nullable().optional(),
    title: z.string().min(1, 'El título del entregable es obligatorio'),
  })).optional(),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const modalidad = searchParams.get('modalidad')
  const estado = searchParams.get('estado')

  const projects = await prisma.clientProject.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(modalidad && { modalidad: modalidad as any }),
      ...(estado && { estado: estado as any }),
    },
    include: {
      client: { select: { id: true, name: true, business: true } },
      service: { select: { id: true, nombre: true, tipo: true, modalidad: true } },
      monthlyPlan: { select: { id: true, month: true, year: true } },
      ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true, metodoPago: true, fechaIngreso: true } },
      contents: {
        select: { id: true, type: true, formato: true, title: true, status: true, driveLink: true, publishedLink: true },
      },
      _count: { select: { contents: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const showFinancials = canViewFinancials(user.role)

  const projectsConCalc = projects.map(p => {
    const totalPagado = p.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const saldoPendiente = p.precioFinal != null ? Math.max(0, p.precioFinal - totalPagado) : null
    const estadoEconomico = p.precioFinal == null ? 'SIN_PRECIO'
      : totalPagado <= 0 ? 'SIN_PAGO'
      : totalPagado >= p.precioFinal ? 'PAGADO'
      : 'ABONADO'
    const enriched = { ...p, totalPagado, saldoPendiente, estadoEconomico }
    return showFinancials ? enriched : stripFinancialFields(enriched)
  })

  return NextResponse.json(projectsConCalc)
}

function calcEstado(monto: number, pagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (pagado <= 0) return 'PENDIENTE'
  if (pagado >= monto) return 'PAGADO'
  return 'PARCIAL'
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const [client, service, monthlyPlan] = await Promise.all([
      prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } }),
      data.serviceId ? prisma.servicePlan.findUnique({ where: { id: data.serviceId }, select: { id: true } }) : null,
      data.monthlyPlanId ? prisma.monthlyPlan.findUnique({ where: { id: data.monthlyPlanId }, select: { id: true, clientId: true } }) : null,
    ])
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    if (data.serviceId && !service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    if (data.monthlyPlanId && !monthlyPlan) return NextResponse.json({ error: 'Plan mensual no encontrado' }, { status: 404 })
    if (monthlyPlan && monthlyPlan.clientId !== data.clientId) {
      return NextResponse.json({ error: 'El plan mensual pertenece a otro cliente' }, { status: 400 })
    }

    // Proyecto, entregables, ingreso y abono se escriben en una sola transacción:
    // si cualquiera falla, no debe quedar un proyecto sin su registro económico
    // ni un ingreso sin su abono. Antes se escribían por separado y un fallo
    // intermedio dejaba registros incompletos.
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.clientProject.create({
        data: {
          clientId: data.clientId,
          serviceId: data.serviceId || null,
          monthlyPlanId: data.monthlyPlanId || null,
          nombre: data.nombre,
          descripcion: data.descripcion || null,
          modalidad: data.modalidad,
          estado: data.estado as any,
          linkEntrega: data.linkEntrega || null,
          mensajeEntrega: data.mensajeEntrega || null,
          driveLink: data.driveLink || null,
          // Mediodía: una fecha suelta (AAAA-MM-DD) se interpreta como medianoche
          // UTC y en Ecuador (UTC−5) caería el día anterior. Fijarla a las 12:00
          // deja el día correcto en ambos husos.
          fechaGrabacion: normalizarFecha(data.fechaGrabacion),
          fechaEntrega: normalizarFecha(data.fechaEntrega),
          observaciones: data.observaciones || null,
          precioBase: data.precioBase ?? null,
          precioFinal: data.precioFinal ?? data.precioBase ?? null,
        },
      })

      // Generar entregables automáticamente si se proporcionaron
      if (data.entregables && data.entregables.length > 0) {
        await tx.content.createMany({
          data: data.entregables.map((e) => ({
            clientId: data.clientId,
            projectId: created.id,
            planId: data.monthlyPlanId || null,
            type: e.type,
            formato: e.formato || null,
            title: e.title,
            status: 'PENDING' as const,
          })),
        })
      }

      // Crear ingreso si se registró abono o pago al crear el proyecto
      const precioFinalReal = data.precioFinal ?? data.precioBase
      const abonoMonto = data.abono && data.abono > 0 && precioFinalReal ? Math.min(data.abono, precioFinalReal) : 0

      if (abonoMonto > 0 && precioFinalReal) {
        const estadoPago = calcEstado(precioFinalReal, abonoMonto)
        const fechaPago = data.fechaPago ? new Date(data.fechaPago) : new Date()

        const ingreso = await tx.ingreso.create({
          data: {
            clienteId: data.clientId,
            projectId: created.id,
            tipoServicio: 'PERSONALIZADO',
            descripcion: `Pago proyecto: ${data.nombre}`,
            monto: precioFinalReal,
            montoPagado: abonoMonto,
            estadoPago,
            metodoPago: data.metodoPago || null,
            fechaIngreso: fechaPago,
            observaciones: data.observacionPago || null,
            creadoPor: user.userId,
          },
        })

        // El abono se registra siempre que haya dinero recibido. Antes dependía de que
        // se eligiera método de pago, y los anticipos sin método quedaban sin respaldo:
        // el ingreso figuraba cobrado pero no existía el abono que lo justificara.
        await tx.abono.create({
          data: {
            ingresoId: ingreso.id,
            monto: abonoMonto,
            metodoPago: data.metodoPago || null,
            fechaAbono: fechaPago,
            observacion: data.observacionPago || null,
            creadoPor: user.userId,
          },
        })
      }

      // Las fechas del proyecto entran al calendario interno, dentro de la misma
      // transacción para que un proyecto nunca quede sin sus eventos.
      await sincronizarEventosProyecto(
        created.id,
        created.nombre,
        data.clientId,
        { fechaGrabacion: created.fechaGrabacion, fechaEntrega: created.fechaEntrega },
        tx,
      )

      return created
    })

    const projectWithContents = await prisma.clientProject.findUnique({
      where: { id: project.id },
      include: {
        client: { select: { id: true, name: true, business: true } },
        service: { select: { id: true, nombre: true, tipo: true } },
        ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true } },
        contents: true,
      },
    })

    return NextResponse.json(projectWithContents, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(' | ')
      return NextResponse.json({ error: `Datos inválidos — ${messages}`, details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/proyectos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
