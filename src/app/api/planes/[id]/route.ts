import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

const planSchema = z.object({
  clientId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  reelsCount: z.number().int().min(0),
  carouselsCount: z.number().int().min(0),
  flyersCount: z.number().int().min(0),
  monthlyPrice: z.number().min(0),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']),
  planStatus: z.enum(['IN_PROGRESS', 'COMPLETED', 'DELAYED']),
  deliveryLink: z.string().optional().nullable(),
  observations: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const plan = await prisma.monthlyPlan.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      ingresos: {
        include: { abonos: { orderBy: { fechaAbono: 'asc' } } },
        orderBy: { fechaIngreso: 'asc' },
      },
      contents: { orderBy: [{ type: 'asc' }, { createdAt: 'asc' }] },
      deliveryAccesses: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const totalPagado = plan.ingresos.reduce((s: number, i: any) => s + i.montoPagado, 0)
  const precioRef = plan.precioFinal ?? plan.monthlyPrice
  const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - totalPagado) : null
  const estadoEconomico = precioRef <= 0 ? 'SIN_PRECIO'
    : totalPagado <= 0 ? 'SIN_PAGO'
    : totalPagado >= precioRef ? 'PAGADO'
    : 'ABONADO'

  return NextResponse.json({ ...plan, totalPagado, saldoPendiente, estadoEconomico })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = planSchema.parse(body)

    const plan = await prisma.monthlyPlan.update({
      where: { id: params.id },
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
        deliveryLink: data.deliveryLink ?? null,
        observations: data.observations || null,
      },
      include: { client: true },
    })

    return NextResponse.json(plan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await prisma.monthlyPlan.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
