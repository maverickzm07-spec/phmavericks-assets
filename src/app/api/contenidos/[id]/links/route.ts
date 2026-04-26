import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const existing = await prisma.content.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await request.json()
  const updateData: any = {}

  if ('driveLink' in body) updateData.driveLink = body.driveLink || null
  if ('publishedLink' in body) updateData.publishedLink = body.publishedLink || null

  // Auto-avanzar estado según links
  const newDrive = 'driveLink' in body ? (body.driveLink || null) : existing.driveLink
  const newPublished = 'publishedLink' in body ? (body.publishedLink || null) : existing.publishedLink

  if (newPublished && existing.requierePublicacion && existing.status !== 'PUBLICADO') {
    updateData.status = 'PUBLICADO'
    updateData.fechaPublicacion = new Date()
    updateData.publishedAt = new Date()
    updateData.fechaEntrega = existing.fechaEntrega || new Date()
  } else if (newDrive && existing.status === 'PENDIENTE') {
    updateData.status = 'EN_PROCESO'
  }

  const content = await prisma.content.update({
    where: { id: params.id },
    data: updateData,
    include: { client: { select: { id: true, name: true } } },
  })

  return NextResponse.json(content)
}
