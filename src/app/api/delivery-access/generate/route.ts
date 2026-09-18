import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { generateDeliverySlug, planEntityName } from '@/lib/deliverySlug'

async function uniqueSlug(clientName: string, entityName: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = generateDeliverySlug(clientName, entityName)
    const exists = await prisma.deliveryAccess.findUnique({ where: { publicSlug: slug } })
    if (!exists) return slug
  }
  return generateDeliverySlug(clientName, randomBytes(4).toString('hex'))
}

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

  // Obtener nombres para el slug
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } })
  let entityName = ''
  if (projectId) {
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { nombre: true } })
    entityName = project?.nombre ?? ''
  } else if (monthlyPlanId) {
    const plan = await prisma.monthlyPlan.findUnique({ where: { id: monthlyPlanId }, select: { month: true, year: true } })
    if (plan) entityName = planEntityName(plan.month, plan.year)
  }

  const token = randomBytes(32).toString('hex')
  const publicSlug = await uniqueSlug(client?.name ?? '', entityName)

  const access = await prisma.deliveryAccess.create({
    data: {
      token,
      publicSlug,
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
