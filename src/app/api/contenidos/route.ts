import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { z } from 'zod'

const createSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().optional().nullable(),
  type: z.enum(['REEL', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA']),
  title: z.string().min(1),
  status: z.enum(['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PUBLICADO']).default('PENDIENTE'),
  requierePublicacion: z.boolean().optional(),
  driveLink: z.string().url().optional().or(z.literal('')).nullable(),
  publishedLink: z.string().url().optional().or(z.literal('')).nullable(),
  observations: z.string().optional().nullable(),
})

function defaultRequierePublicacion(type: string): boolean {
  return type === 'REEL'
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const planId = searchParams.get('planId')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  const where: any = {}
  if (clientId) where.clientId = clientId
  if (planId) where.planId = planId
  if (type) where.type = type
  if (status) where.status = status

  const contents = await prisma.content.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, business: true } },
      plan: { select: { id: true, month: true, year: true } },
    },
    orderBy: [{ clientId: 'asc' }, { type: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json(contents)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const requiere = data.requierePublicacion !== undefined
      ? data.requierePublicacion
      : defaultRequierePublicacion(data.type)

    const content = await prisma.content.create({
      data: {
        clientId: data.clientId,
        planId: data.planId || null,
        type: data.type,
        title: data.title,
        status: data.status,
        requierePublicacion: requiere,
        driveLink: data.driveLink || null,
        publishedLink: data.publishedLink || null,
        observations: data.observations || null,
      },
      include: {
        client: { select: { id: true, name: true, business: true } },
        plan: { select: { id: true, month: true, year: true } },
      },
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
