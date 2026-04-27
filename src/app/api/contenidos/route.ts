import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { z } from 'zod'

const contentSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  type: z.enum(['REEL', 'CAROUSEL', 'FLYER', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA', 'VIDEO', 'OTRO']),
  formato: z.enum(['VERTICAL_9_16', 'HORIZONTAL_16_9', 'CUADRADO_1_1', 'NO_APLICA']).nullable().optional(),
  title: z.string().min(1),
  status: z.enum(['PENDING', 'EDITING', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PUBLICADO']).default('PENDING'),
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
  const formato = searchParams.get('formato')
  const status = searchParams.get('status')
  const modalidad = searchParams.get('modalidad')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const contents = await prisma.content.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(planId && { planId }),
      ...(type && { type: type as any }),
      ...(formato && { formato: formato as any }),
      ...(status && { status: status as any }),
      ...(modalidad && { project: { modalidad: modalidad as any } }),
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
      project: { select: { id: true, nombre: true, modalidad: true } },
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
        projectId: data.projectId || null,
        type: data.type,
        formato: data.formato || null,
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
        project: { select: { id: true, nombre: true, modalidad: true } },
      },
    })

    // Auto-completar proyecto si todos sus entregables están listos
    if (content.projectId) {
      const siblings = await prisma.content.findMany({ where: { projectId: content.projectId } })
      const doneStatuses = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']
      if (siblings.every((c) => doneStatuses.includes(c.status))) {
        await prisma.clientProject.update({ where: { id: content.projectId }, data: { estado: 'COMPLETADO' } })
      }
    }

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
