import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUBLIC_DELIVERY_INCLUDE, serializePublicDelivery } from '@/lib/publicDelivery'

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const access = await prisma.deliveryAccess.findUnique({
    where: { publicSlug: params.slug },
    include: PUBLIC_DELIVERY_INCLUDE,
  })

  if (!access) return NextResponse.json({ error: 'Este enlace no está disponible.' }, { status: 404 })
  if (!access.isActive) return NextResponse.json({ error: 'Este enlace no está disponible.' }, { status: 403 })

  // Nunca devolver el registro completo (contiene token secreto e IDs internos)
  return NextResponse.json(serializePublicDelivery(access))
}
