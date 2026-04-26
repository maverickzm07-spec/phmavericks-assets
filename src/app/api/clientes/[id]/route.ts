import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteClients, canDeleteData } from '@/lib/permissions'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1).optional(),
  business: z.string().min(1).optional(),
  contact: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'PAUSED', 'FINISHED']).optional(),
  notes: z.string().optional(),
  servicePlanId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      monthlyPlans: {
        include: { _count: { select: { contents: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      },
      servicePlan: { select: { id: true, nombre: true, tipo: true, precio: true, cantidadReels: true, cantidadVideosHorizontales: true, cantidadFotos: true } },
      _count: { select: { monthlyPlans: true, contents: true } },
    },
  })

  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteClients(user.role)) return NextResponse.json({ error: 'Sin permisos para editar clientes' }, { status: 403 })

  try {
    const body = await request.json()
    const data = clientSchema.parse(body)

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.business !== undefined) updateData.business = data.business
    if (data.contact !== undefined) updateData.contact = data.contact || null
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp || null
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if ('servicePlanId' in data) updateData.servicePlanId = data.servicePlanId || null

    const client = await prisma.client.update({
      where: { id: params.id },
      data: updateData,
      include: { servicePlan: { select: { id: true, nombre: true, tipo: true, precio: true, cantidadReels: true, cantidadVideosHorizontales: true, cantidadFotos: true } } },
    })

    return NextResponse.json(client)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canDeleteData(user.role)) return NextResponse.json({ error: 'Solo el Super Admin puede eliminar clientes' }, { status: 403 })

  await prisma.client.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
