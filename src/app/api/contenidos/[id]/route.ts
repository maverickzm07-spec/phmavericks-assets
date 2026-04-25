import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

const contentSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().min(1),
  type: z.enum(['REEL', 'CAROUSEL', 'FLYER']),
  title: z.string().min(1),
  status: z.enum(['PENDING', 'EDITING', 'APPROVED', 'PUBLISHED', 'COMPLETED']),
  driveLink: z.string().url().optional().or(z.literal('')),
  publishedLink: z.string().url().optional().or(z.literal('')),
  publishedAt: z.string().optional(),
  views: z.number().int().min(0),
  likes: z.number().int().min(0),
  comments: z.number().int().min(0),
  shares: z.number().int().min(0),
  saves: z.number().int().min(0),
  observations: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      plan: { include: { client: true } },
    },
  })

  if (!content) return NextResponse.json({ error: 'Contenido no encontrado' }, { status: 404 })
  return NextResponse.json(content)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = contentSchema.parse(body)

    const content = await prisma.content.update({
      where: { id: params.id },
      data: {
        clientId: data.clientId,
        planId: data.planId,
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

    return NextResponse.json(content)
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

  await prisma.content.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
