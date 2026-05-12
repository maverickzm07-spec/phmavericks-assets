import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { z } from 'zod'

const VALID_CONTENT_TYPES = ['REEL', 'CAROUSEL', 'FLYER', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA', 'VIDEO', 'OTRO'] as const
const VALID_FORMATS = ['VERTICAL_9_16', 'HORIZONTAL_16_9', 'CUADRADO_1_1', 'NO_APLICA'] as const

const createSchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  serviceId: z.string().nullable().optional(),
  monthlyPlanId: z.string().nullable().optional(),
  nombre: z.string().min(1, 'El nombre del proyecto es obligatorio'),
  modalidad: z.enum(['MENSUAL', 'OCASIONAL'], { errorMap: () => ({ message: 'Modalidad inválida' }) }).default('OCASIONAL'),
  estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO', 'ENTREGADO', 'COMPLETADO', 'ATRASADO']).default('PENDIENTE'),
  linkEntrega: z.union([z.string().url('El link de entrega debe ser una URL válida'), z.literal(''), z.null()]).optional(),
  fechaEntrega: z.union([z.string(), z.null()]).optional(),
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

  const projectsConCalc = projects.map(p => {
    const totalPagado = p.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const saldoPendiente = p.precioFinal != null ? Math.max(0, p.precioFinal - totalPagado) : null
    const estadoEconomico = p.precioFinal == null ? 'SIN_PRECIO'
      : totalPagado <= 0 ? 'SIN_PAGO'
      : totalPagado >= p.precioFinal ? 'PAGADO'
      : 'ABONADO'
    return { ...p, totalPagado, saldoPendiente, estadoEconomico }
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

    const project = await prisma.clientProject.create({
      data: {
        clientId: data.clientId,
        serviceId: data.serviceId || null,
        monthlyPlanId: data.monthlyPlanId || null,
        nombre: data.nombre,
        modalidad: data.modalidad,
        estado: data.estado,
        linkEntrega: data.linkEntrega || null,
        fechaEntrega: data.fechaEntrega ? new Date(data.fechaEntrega) : null,
        observaciones: data.observaciones || null,
        precioBase: data.precioBase ?? null,
        precioFinal: data.precioFinal ?? data.precioBase ?? null,
      },
    })

    // Generar entregables automáticamente si se proporcionaron
    if (data.entregables && data.entregables.length > 0) {
      await prisma.content.createMany({
        data: data.entregables.map((e) => ({
          clientId: data.clientId,
          projectId: project.id,
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

      const ingreso = await prisma.ingreso.create({
        data: {
          clienteId: data.clientId,
          projectId: project.id,
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

      if (data.metodoPago) {
        await prisma.abono.create({
          data: {
            ingresoId: ingreso.id,
            monto: abonoMonto,
            metodoPago: data.metodoPago,
            fechaAbono: fechaPago,
            observacion: data.observacionPago || null,
            creadoPor: user.userId,
          },
        })
      }
    }

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
