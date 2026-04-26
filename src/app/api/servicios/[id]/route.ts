import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canManageServices, canDeleteData } from '@/lib/permissions'
import { z } from 'zod'

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(['CONTENIDO', 'IA', 'FOTOGRAFIA', 'PERSONALIZADO']).optional(),
  precio: z.number().positive().optional(),
  cantidadReels: z.number().int().min(0).optional(),
  cantidadFotos: z.number().int().min(0).optional(),
  jornadasGrabacion: z.number().int().min(0).optional(),
  duracion: z.string().optional(),
  vestuarios: z.number().int().min(0).optional(),
  descripcion: z.string().optional(),
  caracteristicas: z.array(z.string()).optional(),
  activo: z.boolean().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageServices(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const plan = await prisma.servicePlan.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(plan)
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
  if (!canManageServices(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const plan = await prisma.servicePlan.findUnique({ where: { id: params.id } })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  if (plan.esDefault) {
    return NextResponse.json({ error: 'Los planes por defecto no se pueden eliminar. Usa desactivar.' }, { status: 400 })
  }

  // Desconectar de clientes antes de eliminar
  await prisma.client.updateMany({
    where: { servicePlanId: params.id },
    data: { servicePlanId: null },
  })

  await prisma.servicePlan.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
