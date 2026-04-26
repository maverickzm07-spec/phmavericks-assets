import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { status } = await request.json()
  const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PUBLICADO']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const updateData: any = { status }
  if (status === 'ENTREGADO') updateData.fechaEntrega = new Date()
  if (status === 'PUBLICADO') {
    updateData.fechaPublicacion = new Date()
    updateData.publishedAt = new Date()
    if (!updateData.fechaEntrega) updateData.fechaEntrega = new Date()
  }

  const content = await prisma.content.update({
    where: { id: params.id },
    data: updateData,
    include: { client: { select: { id: true, name: true } } },
  })

  return NextResponse.json(content)
}
