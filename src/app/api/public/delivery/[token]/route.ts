import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PUBLIC_DELIVERY_INCLUDE, serializePublicDelivery } from '@/lib/publicDelivery'

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const access = await prisma.deliveryAccess.findUnique({
    where: { token: params.token },
    include: PUBLIC_DELIVERY_INCLUDE,
  })

  if (!access) return NextResponse.json({ error: 'Link no encontrado' }, { status: 404 })
  if (!access.isActive) return NextResponse.json({ error: 'Link desactivado' }, { status: 403 })

  // Nunca devolver el registro completo (contiene token secreto e IDs internos)
  return NextResponse.json(serializePublicDelivery(access))
}
