import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { z } from 'zod'

const metricasSchema = z.object({
  views: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = metricasSchema.parse(body)

    const content = await prisma.content.update({
      where: { id: params.id },
      data: {
        ...data,
        ultimaActualizacionMetricas: new Date(),
        estadoSincronizacion: 'MANUAL',
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
