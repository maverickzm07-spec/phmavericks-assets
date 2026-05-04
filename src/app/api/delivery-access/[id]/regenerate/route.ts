import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { generateDeliverySlug, planEntityName } from '@/lib/deliverySlug'

async function uniqueSlug(clientName: string, entityName: string, excludeId: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = generateDeliverySlug(clientName, entityName)
    const exists = await prisma.deliveryAccess.findFirst({
      where: { publicSlug: slug, NOT: { id: excludeId } },
    })
    if (!exists) return slug
  }
  return generateDeliverySlug(clientName, randomBytes(4).toString('hex'))
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const current = await prisma.deliveryAccess.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true } },
      project: { select: { nombre: true } },
      monthlyPlan: { select: { month: true, year: true } },
    },
  })

  if (!current) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let entityName = ''
  if (current.project) {
    entityName = current.project.nombre
  } else if (current.monthlyPlan) {
    entityName = planEntityName(current.monthlyPlan.month, current.monthlyPlan.year)
  }

  const token = randomBytes(32).toString('hex')
  const publicSlug = await uniqueSlug(current.client.name, entityName, params.id)

  const access = await prisma.deliveryAccess.update({
    where: { id: params.id },
    data: { token, publicSlug, isActive: true },
  })

  return NextResponse.json(access)
}
