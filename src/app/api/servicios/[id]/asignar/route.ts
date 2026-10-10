import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  precioFinal: z.number().positive().optional().nullable(),
  abono: z.number().min(0).optional().nullable(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  observacionPago: z.string().optional().nullable(),
  nombreProyecto: z.string().optional().nullable(),
})

function calcEstado(monto: number, pagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (pagado <= 0) return 'PENDIENTE'
  if (pagado >= monto) return 'PAGADO'
  return 'PARCIAL'
}

/**
 * Asignar un servicio a un cliente crea siempre un ClientProject.
 *
 * Antes, un servicio de modalidad MENSUAL generaba un MonthlyPlan automáticamente.
 * Los planes mensuales se retiraron como módulo, y ningún trabajo debe quedar
 * obligado a colgar de un plan: el catálogo de servicios sirve ahora para
 * clasificar el proyecto y precargar su precio, nada más.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos para asignar servicios' }, { status: 403 })

  try {
    const body = await request.json()
    const data = schema.parse(body)

    const service = await prisma.servicePlan.findUnique({ where: { id: params.id } })
    if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    if (!service.activo) return NextResponse.json({ error: 'No se puede asignar un servicio inactivo' }, { status: 400 })

    const client = await prisma.client.findUnique({ where: { id: data.clientId } })
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const precioBase = service.precio
    const precioFinal = data.precioFinal ?? precioBase
    const abonoMonto = data.abono && data.abono > 0 ? Math.min(data.abono, precioFinal) : 0
    const fechaPago = data.fechaPago ? new Date(data.fechaPago) : new Date()
    const nombre = data.nombreProyecto || service.nombre

    // Proyecto, ingreso y abono en una sola transacción: un fallo intermedio no debe
    // dejar un proyecto sin su registro económico ni un ingreso sin su abono.
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.clientProject.create({
        data: {
          clientId: data.clientId,
          serviceId: params.id,
          nombre,
          modalidad: service.modalidad,
          estado: 'PENDIENTE',
          precioBase,
          precioFinal,
        },
      })

      if (abonoMonto > 0) {
        const ingreso = await tx.ingreso.create({
          data: {
            clienteId: data.clientId,
            projectId: created.id,
            tipoServicio: 'PERSONALIZADO',
            descripcion: `Pago proyecto: ${nombre}`,
            monto: precioFinal,
            montoPagado: abonoMonto,
            estadoPago: calcEstado(precioFinal, abonoMonto),
            metodoPago: data.metodoPago || null,
            fechaIngreso: fechaPago,
            observaciones: data.observacionPago || null,
            creadoPor: user.userId,
          },
        })

        // El abono se registra siempre que haya dinero recibido, con o sin método de pago.
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

      return created
    })

    const projectFinal = await prisma.clientProject.findUnique({
      where: { id: project.id },
      include: {
        client: { select: { id: true, name: true, business: true } },
        service: { select: { id: true, nombre: true, tipo: true } },
        ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true } },
        _count: { select: { contents: true } },
      },
    })

    return NextResponse.json({ success: true, tipo: 'PROYECTO', project: projectFinal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/servicios/[id]/asignar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
