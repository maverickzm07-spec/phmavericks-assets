import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canGenerateEntregables } from '@/lib/permissions'

type ContentType = 'REEL' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER'

function buildEntregables(plan: {
  cantidadReels: number
  cantidadVideosHorizontales: number
  cantidadFotos: number
  cantidadImagenesFlyers: number
}): { type: ContentType; title: string; requierePublicacion: boolean }[] {
  const items: { type: ContentType; title: string; requierePublicacion: boolean }[] = []
  for (let i = 1; i <= plan.cantidadReels; i++) items.push({ type: 'REEL', title: `Reel ${i}`, requierePublicacion: true })
  for (let i = 1; i <= plan.cantidadVideosHorizontales; i++) items.push({ type: 'VIDEO_HORIZONTAL', title: `Video horizontal ${i}`, requierePublicacion: false })
  for (let i = 1; i <= plan.cantidadFotos; i++) items.push({ type: 'FOTO', title: `Foto ${i}`, requierePublicacion: false })
  for (let i = 1; i <= plan.cantidadImagenesFlyers; i++) items.push({ type: 'IMAGEN_FLYER', title: `Imagen/Flyer ${i}`, requierePublicacion: false })
  return items
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canGenerateEntregables(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { servicePlan: true },
  })

  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  if (!client.servicePlan) return NextResponse.json({ error: 'El cliente no tiene plan de servicio asignado' }, { status: 400 })

  const entregables = buildEntregables(client.servicePlan)
  if (entregables.length === 0) {
    return NextResponse.json({ error: 'El plan asignado no tiene cantidades definidas' }, { status: 400 })
  }

  const created = await prisma.$transaction(
    entregables.map((e) =>
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
}
