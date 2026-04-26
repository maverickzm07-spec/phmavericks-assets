import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canGenerateEntregables } from '@/lib/permissions'

type ContentType = 'REEL' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canGenerateEntregables(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { servicePlan: true },
    })

    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    if (!client.servicePlan) return NextResponse.json({ error: 'El cliente no tiene plan de servicio asignado' }, { status: 400 })

    const plan = client.servicePlan
    const existingContents = await prisma.content.findMany({
      where: { clientId: params.id },
      select: { type: true },
    })

    const countByType: Record<ContentType, number> = {
      REEL: 0, VIDEO_HORIZONTAL: 0, FOTO: 0, IMAGEN_FLYER: 0,
    }
    for (const c of existingContents) {
      if (c.type in countByType) countByType[c.type as ContentType]++
    }

    type EntregableSpec = { type: ContentType; title: string; requierePublicacion: boolean }
    const toCreate: EntregableSpec[] = []

    const targets: { type: ContentType; cantidad: number; label: string; requiere: boolean }[] = [
      { type: 'REEL', cantidad: plan.cantidadReels, label: 'Reel', requiere: true },
      { type: 'VIDEO_HORIZONTAL', cantidad: plan.cantidadVideosHorizontales, label: 'Video horizontal', requiere: false },
      { type: 'FOTO', cantidad: plan.cantidadFotos, label: 'Foto', requiere: false },
      { type: 'IMAGEN_FLYER', cantidad: plan.cantidadImagenesFlyers, label: 'Imagen/Flyer', requiere: false },
    ]

    for (const t of targets) {
      const existing = countByType[t.type]
      const faltantes = t.cantidad - existing
      for (let i = 1; i <= faltantes; i++) {
        toCreate.push({
          type: t.type,
          title: `${t.label} ${existing + i}`,
          requierePublicacion: t.requiere,
        })
      }
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, message: 'No hay entregables faltantes' })
    }

    const created = await prisma.$transaction(
      toCreate.map((e) =>
        prisma.content.create({
          data: {
            clientId: params.id,
            type: e.type,
            title: e.title,
            status: 'PENDIENTE',
            requierePublicacion: e.requierePublicacion,
          },
        })
      )
    )

    return NextResponse.json({ created: created.length, entregables: created }, { status: 201 })
  } catch (error) {
    console.error('POST generar-entregables-faltantes:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
