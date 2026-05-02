import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { clientId, projectId, monthlyPlanId, type } = body

  if (!clientId || !type) {
    return NextResponse.json({ error: 'clientId y type son requeridos' }, { status: 400 })
  }

  const token = randomBytes(32).toString('hex')

  const access = await prisma.deliveryAccess.create({
    data: {
      token,
      clientId,
      projectId: projectId ?? null,
      monthlyPlanId: monthlyPlanId ?? null,
      type,
      isActive: true,
      createdById: user.userId,
    },
  })

  return NextResponse.json(access, { status: 201 })
}
