import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents, canDeleteContents } from '@/lib/permissions'
import { z } from 'zod'

const updateSchema = z.object({
  clientId: z.string().min(1).optional(),
  planId: z.string().optional().nullable(),
  type: z.enum(['REEL', 'VIDEO_HORIZONTAL', 'FOTO', 'IMAGEN_FLYER', 'EXTRA']).optional(),
  title: z.string().min(1).optional(),
  status: z.enum(['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PUBLICADO']).optional(),
  requierePublicacion: z.boolean().optional(),
  driveLink: z.string().url().optional().or(z.literal('')).nullable(),
  publishedLink: z.string().url().optional().or(z.literal('')).nullable(),
  observations: z.string().optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, business: true } },
      plan: { select: { id: true, month: true, year: true } },
    },
  })

  if (!content) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(content)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.content.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const updateData: any = { ...data }
    if ('driveLink' in data) updateData.driveLink = data.driveLink || null
    if ('publishedLink' in data) updateData.publishedLink = data.publishedLink || null
    if ('planId' in data) updateData.planId = data.planId || null

    const content = await prisma.content.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, business: true } },
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
  if (!canDeleteContents(user.role)) return NextResponse.json({ error: 'Solo el Super Admin puede eliminar contenidos' }, { status: 403 })

  await prisma.content.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
