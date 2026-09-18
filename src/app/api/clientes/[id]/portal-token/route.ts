import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteClients } from '@/lib/permissions'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteClients(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const token = randomBytes(32).toString('hex')

  const client = await prisma.client.update({
    where: { id: params.id },
    data: { clientPortalToken: token },
    select: { id: true, clientPortalToken: true },
  })

  return NextResponse.json({ token: client.clientPortalToken })
}
