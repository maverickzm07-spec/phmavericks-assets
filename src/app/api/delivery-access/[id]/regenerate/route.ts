import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const token = randomBytes(32).toString('hex')

  const access = await prisma.deliveryAccess.update({
    where: { id: params.id },
    data: { token, isActive: true },
  })

  return NextResponse.json(access)
}
