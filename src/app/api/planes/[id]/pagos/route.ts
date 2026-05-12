import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

const pagoSchema = z.object({
  monto: z.number().positive('El monto debe ser mayor a 0'),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const plan = await prisma.monthlyPlan.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true } },
      ingresos: { select: { montoPagado: true } },
    },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = pagoSchema.parse(body)

    const fechaPago = data.fechaPago ? new Date(data.fechaPago) : new Date()
    const totalPagadoAntes = plan.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const precioRef = plan.precioFinal ?? plan.monthlyPrice

    const montoPago = data.monto
    const nombreMes = new Date(plan.year, plan.month - 1).toLocaleString('es', { month: 'long' })

    const ingreso = await prisma.ingreso.create({
      data: {
        clienteId: plan.clientId,
        monthlyPlanId: plan.id,
        tipoServicio: 'PLAN_MENSUAL',
        descripcion: data.observacion || `Pago plan ${nombreMes} ${plan.year}`,
        monto: montoPago,
        montoPagado: montoPago,
        estadoPago: 'PAGADO',
        metodoPago: data.metodoPago || null,
        fechaIngreso: fechaPago,
        observaciones: data.observacion || null,
        creadoPor: user.userId,
      },
    })

    const totalPagadoNuevo = totalPagadoAntes + montoPago
    const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - totalPagadoNuevo) : null
    const estadoEconomico = precioRef <= 0 ? 'SIN_PRECIO'
      : totalPagadoNuevo <= 0 ? 'SIN_PAGO'
      : totalPagadoNuevo >= precioRef ? 'PAGADO'
      : 'ABONADO'

    return NextResponse.json({
      ingreso,
      resumen: {
        totalPagado: totalPagadoNuevo,
        saldoPendiente,
        estadoEconomico,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/planes/[id]/pagos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
