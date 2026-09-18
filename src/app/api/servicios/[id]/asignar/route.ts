import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteMonthlyPlans } from '@/lib/permissions'
import { createOrUpdateMonthlyPlanForClient } from '@/lib/monthlyPlanUtils'
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteMonthlyPlans(user.role)) return NextResponse.json({ error: 'Sin permisos para asignar servicios' }, { status: 403 })

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

    // ── Servicio MENSUAL → crear / actualizar MonthlyPlan ──────────────
    if (service.modalidad === 'MENSUAL') {
      await prisma.client.update({
        where: { id: data.clientId },
        data: { servicePlanId: params.id },
      })

      await createOrUpdateMonthlyPlanForClient(data.clientId, params.id)

      const now = new Date()
      const plan = await prisma.monthlyPlan.findFirst({
        where: { clientId: data.clientId, servicePlanId: params.id, month: now.getMonth() + 1, year: now.getFullYear() },
      })

      if (plan) {
        await prisma.monthlyPlan.update({
          where: { id: plan.id },
          data: { precioBase, precioFinal },
        })

        if (abonoMonto > 0) {
          const estadoPago = calcEstado(precioFinal, abonoMonto)
          const ingreso = await prisma.ingreso.create({
            data: {
              clienteId: data.clientId,
              monthlyPlanId: plan.id,
              tipoServicio: 'PLAN_MENSUAL',
              descripcion: `Pago plan ${service.nombre} — ${now.toLocaleString('es', { month: 'long' })} ${now.getFullYear()}`,
              monto: precioFinal,
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
      }

      const planFinal = await prisma.monthlyPlan.findFirst({
        where: { clientId: data.clientId, servicePlanId: params.id, month: now.getMonth() + 1, year: now.getFullYear() },
        include: {
          client: { select: { id: true, name: true, business: true } },
          ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true } },
          _count: { select: { contents: true } },
        },
      })

      return NextResponse.json({ success: true, tipo: 'MENSUAL', plan: planFinal }, { status: 201 })
    }

    // ── Servicio OCASIONAL → crear ClientProject ───────────────────────
    if (service.modalidad === 'OCASIONAL') {
      const nombre = data.nombreProyecto || service.nombre
      const project = await prisma.clientProject.create({
        data: {
          clientId: data.clientId,
          serviceId: params.id,
          nombre,
          modalidad: 'OCASIONAL',
          estado: 'PENDIENTE',
          precioBase,
          precioFinal,
        },
      })

      if (abonoMonto > 0) {
        const estadoPago = calcEstado(precioFinal, abonoMonto)
        const ingreso = await prisma.ingreso.create({
          data: {
            clienteId: data.clientId,
            projectId: project.id,
            tipoServicio: 'PERSONALIZADO',
            descripcion: `Pago proyecto: ${nombre}`,
            monto: precioFinal,
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

      const projectFinal = await prisma.clientProject.findUnique({
        where: { id: project.id },
        include: {
          client: { select: { id: true, name: true, business: true } },
          service: { select: { id: true, nombre: true, tipo: true } },
          ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true } },
          _count: { select: { contents: true } },
        },
      })

      return NextResponse.json({ success: true, tipo: 'OCASIONAL', project: projectFinal }, { status: 201 })
    }

    return NextResponse.json({ error: 'Modalidad de servicio no reconocida' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/servicios/[id]/asignar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
