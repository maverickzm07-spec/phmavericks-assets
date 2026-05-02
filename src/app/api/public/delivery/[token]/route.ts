import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const access = await prisma.deliveryAccess.findUnique({
    where: { token: params.token },
    include: {
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
    },
  })

  if (!access) return NextResponse.json({ error: 'Link no encontrado' }, { status: 404 })
  if (!access.isActive) return NextResponse.json({ error: 'Link desactivado' }, { status: 403 })

  return NextResponse.json(access)
}
