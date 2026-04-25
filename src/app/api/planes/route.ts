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
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']).default('PENDING'),
  planStatus: z.enum(['IN_PROGRESS', 'COMPLETED', 'DELAYED']).default('IN_PROGRESS'),
  observations: z.string().optional(),
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
      _count: { select: { contents: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return NextResponse.json(plans)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = planSchema.parse(body)

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
      },
      include: { client: true },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
