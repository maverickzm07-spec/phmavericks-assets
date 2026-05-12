import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteMonthlyPlans } from '@/lib/permissions'
import { z } from 'zod'

const planSchema = z.object({
  clientId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  reelsCount: z.number().int().min(0),
  carouselsCount: z.number().int().min(0),
  flyersCount: z.number().int().min(0),
  monthlyPrice: z.number().min(0),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']).default('PENDING'),
  planStatus: z.enum(['IN_PROGRESS', 'COMPLETED', 'DELAYED']).default('IN_PROGRESS'),
  observations: z.string().optional(),
  precioBase: z.number().min(0).optional().nullable(),
  precioFinal: z.number().min(0).optional().nullable(),
  abono: z.number().min(0).optional().nullable(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  observacionPago: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const planStatus = searchParams.get('planStatus')

  const plans = await prisma.monthlyPlan.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(month && { month: parseInt(month) }),
      ...(year && { year: parseInt(year) }),
      ...(planStatus && { planStatus: planStatus as 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' }),
    },
    include: {
      client: true,
      contents: true,
      ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true, metodoPago: true, fechaIngreso: true } },
      _count: { select: { contents: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  const plansConCalc = plans.map(p => {
    const totalPagado = p.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const precioRef = p.precioFinal ?? p.monthlyPrice
    const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - totalPagado) : null
    const estadoEconomico = precioRef <= 0 ? 'SIN_PRECIO'
      : totalPagado <= 0 ? 'SIN_PAGO'
      : totalPagado >= precioRef ? 'PAGADO'
      : 'ABONADO'
    return { ...p, totalPagado, saldoPendiente, estadoEconomico }
  })

  return NextResponse.json(plansConCalc)
}

function calcEstadoPlan(monto: number, pagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (pagado <= 0) return 'PENDIENTE'
  if (pagado >= monto) return 'PAGADO'
  return 'PARCIAL'
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteMonthlyPlans(user.role)) return NextResponse.json({ error: 'Sin permisos para crear planes' }, { status: 403 })

  try {
    const body = await request.json()
    const data = planSchema.parse(body)

    const existingPlan = await prisma.monthlyPlan.findFirst({
      where: { clientId: data.clientId, month: data.month, year: data.year },
    })
    if (existingPlan) {
      return NextResponse.json(
        { error: `Ya existe un plan para este cliente en ${data.month}/${data.year}`, existingId: existingPlan.id },
        { status: 409 }
      )
    }

    const precioFinalReal = data.precioFinal ?? data.precioBase ?? null

    const plan = await prisma.monthlyPlan.create({
      data: {
        clientId: data.clientId,
        month: data.month,
        year: data.year,
        reelsCount: data.reelsCount,
        carouselsCount: data.carouselsCount,
        flyersCount: data.flyersCount,
        monthlyPrice: data.monthlyPrice,
        paymentStatus: data.paymentStatus,
        planStatus: data.planStatus,
        observations: data.observations || null,
        precioBase: data.precioBase ?? null,
        precioFinal: precioFinalReal,
      },
      include: { client: true },
    })

    // Crear ingreso si se registró abono o pago al crear el plan
    const abonoMonto = data.abono && data.abono > 0 && precioFinalReal ? Math.min(data.abono, precioFinalReal) : 0

    if (abonoMonto > 0 && precioFinalReal) {
      const estadoPago = calcEstadoPlan(precioFinalReal, abonoMonto)
      const fechaPago = data.fechaPago ? new Date(data.fechaPago) : new Date()
      const nombreMes = new Date(data.year, data.month - 1).toLocaleString('es', { month: 'long' })

      const ingreso = await prisma.ingreso.create({
        data: {
          clienteId: data.clientId,
          monthlyPlanId: plan.id,
          tipoServicio: 'PLAN_MENSUAL',
          descripcion: `Pago plan mensual — ${nombreMes} ${data.year}`,
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

    const planFinal = await prisma.monthlyPlan.findUnique({
      where: { id: plan.id },
      include: {
        client: true,
        ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true } },
      },
    })

    return NextResponse.json(planFinal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
