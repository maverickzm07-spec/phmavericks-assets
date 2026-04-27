import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { z } from 'zod'

const contentSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().nullable().optional(),
  type: z.enum(['REEL', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA']),
  title: z.string().min(1),
  status: z.enum(['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PUBLICADO']).default('PENDIENTE'),
  driveLink: z.string().url().optional().or(z.literal('')),
  publishedLink: z.string().url().optional().or(z.literal('')),
  publishedAt: z.string().optional(),
  views: z.number().int().min(0).default(0),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0),
  observations: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const planId = searchParams.get('planId')
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const contents = await prisma.content.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(planId && { planId }),
      ...(type && { type: type as 'REEL' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER' | 'EXTRA' }),
      ...(status && { status: status as 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADO' | 'PUBLICADO' }),
      ...(month || year
        ? {
            plan: {
              ...(month && { month: parseInt(month) }),
              ...(year && { year: parseInt(year) }),
            },
          }
        : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      plan: { select: { id: true, month: true, year: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contents)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos para crear contenidos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = contentSchema.parse(body)

    const content = await prisma.content.create({
      data: {
        clientId: data.clientId,
        planId: data.planId || null,
        type: data.type,
        title: data.title,
        status: data.status,
        driveLink: data.driveLink || null,
        publishedLink: data.publishedLink || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        saves: data.saves,
        observations: data.observations || null,
      },
      include: {
        client: { select: { id: true, name: true } },
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
