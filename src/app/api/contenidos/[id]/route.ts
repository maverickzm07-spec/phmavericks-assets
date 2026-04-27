import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

const contentSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  type: z.enum(['REEL', 'CAROUSEL', 'FLYER', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA', 'VIDEO', 'OTRO']),
  formato: z.enum(['VERTICAL_9_16', 'HORIZONTAL_16_9', 'CUADRADO_1_1', 'NO_APLICA']).nullable().optional(),
  title: z.string().min(1),
  status: z.enum(['PENDING', 'EDITING', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PUBLICADO']),
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

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      plan: { include: { client: true } },
      project: { select: { id: true, nombre: true, modalidad: true, estado: true } },
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
      if (siblings.every((c) => DONE_STATUSES.includes(c.status))) {
        await prisma.clientProject.update({ where: { id: content.projectId }, data: { estado: 'COMPLETADO' } })
      } else {
        // Si al menos uno está en proceso, asegurarse de que no esté PENDIENTE
        const anyInProgress = siblings.some((c) => ['EDITING', 'EN_PROCESO', 'EN_EDICION'].includes(c.status))
        if (anyInProgress) {
          await prisma.clientProject.updateMany({
            where: { id: content.projectId, estado: 'PENDIENTE' },
            data: { estado: 'EN_PROCESO' },
          })
        }
      }
    }

    return NextResponse.json(content)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
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
