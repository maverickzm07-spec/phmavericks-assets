import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const INCLUDE = {
  client: { select: { id: true, name: true, business: true } },
  monthlyPlan: {
    select: {
      id: true,
      month: true,
      year: true,
      planStatus: true,
      paymentStatus: true,
      monthlyPrice: true,
      deliveryLink: true,
    },
  },
  project: {
    select: {
      id: true,
      nombre: true,
      estado: true,
      linkEntrega: true,
      fechaEntrega: true,
      observaciones: true,
    },
  },
}

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const access = await prisma.deliveryAccess.findUnique({
    where: { publicSlug: params.slug },
    include: INCLUDE,
  })

  if (!access) return NextResponse.json({ error: 'Este enlace no está disponible.' }, { status: 404 })
  if (!access.isActive) return NextResponse.json({ error: 'Este enlace no está disponible.' }, { status: 403 })

  return NextResponse.json(access)
}
