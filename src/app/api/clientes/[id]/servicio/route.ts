import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteMonthlyPlans } from '@/lib/permissions'
import { logAudit } from '@/lib/auditLog'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteMonthlyPlans(user.role)) return NextResponse.json({ error: 'Solo Admin puede desasignar servicios' }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, servicePlanId: true },
  })
  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  if (!client.servicePlanId) return NextResponse.json({ error: 'El cliente no tiene servicio asignado' }, { status: 400 })

  await prisma.client.update({
    where: { id: params.id },
    data: { servicePlanId: null },
  })

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    action: 'UNASSIGN_SERVICE',
    entity: 'Client',
    entityId: params.id,
    before: { servicePlanId: client.servicePlanId },
    after: { servicePlanId: null },
  })

  return NextResponse.json({ success: true })
}
