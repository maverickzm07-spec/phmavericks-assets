import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteClients } from '@/lib/permissions'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1),
  business: z.string().min(1),
  contact: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'PAUSED', 'FINISHED']).default('ACTIVE'),
  notes: z.string().optional(),
  servicePlanId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const clients = await prisma.client.findMany({
    where: {
      ...(status && { status: status as 'ACTIVE' | 'PAUSED' | 'FINISHED' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { business: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      _count: { select: { monthlyPlans: true, contents: true } },
      servicePlan: { select: { id: true, nombre: true, tipo: true, precio: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(clients)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteClients(user.role)) return NextResponse.json({ error: 'Sin permisos para crear clientes' }, { status: 403 })

  try {
    const body = await request.json()
    const data = clientSchema.parse(body)

    const client = await prisma.client.create({
      data: {
        name: data.name,
        business: data.business,
        contact: data.contact || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        status: data.status,
        notes: data.notes || null,
        servicePlanId: data.servicePlanId || null,
      },
      include: { servicePlan: { select: { id: true, nombre: true, tipo: true, precio: true } } },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
