import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteIngresos, canDeleteIngresos } from '@/lib/permissions'
import { z } from 'zod'

const updateSchema = z.object({
  clienteId: z.string().optional().nullable(),
  tipoServicio: z.enum(['FOTOGRAFIA', 'REELS', 'VIDEOS_HORIZONTALES', 'IMAGENES_FLYERS', 'PLAN_MENSUAL', 'PERSONALIZADO']).optional(),
  descripcion: z.string().optional().nullable(),
  monto: z.number().positive().optional(),
  montoPagado: z.number().min(0).optional(),
  estadoPago: z.enum(['PAGADO', 'PENDIENTE', 'PARCIAL']).optional(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaIngreso: z.string().optional(),
  observaciones: z.string().optional().nullable(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: any = { ...data }
    if (data.fechaIngreso) updateData.fechaIngreso = new Date(data.fechaIngreso)

    if (data.estadoPago === 'PAGADO' && data.monto !== undefined) updateData.montoPagado = data.monto
    if (data.estadoPago === 'PENDIENTE') updateData.montoPagado = 0

    const ingreso = await prisma.ingreso.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: { select: { id: true, name: true, business: true } },
        creadoPorUser: { select: { name: true } },
      },
    })

    return NextResponse.json(ingreso)
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
  if (!canDeleteIngresos(user.role)) return NextResponse.json({ error: 'Solo el Super Admin puede eliminar ingresos' }, { status: 403 })

  await prisma.ingreso.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { estadoPago } = await request.json()
  if (!['PAGADO', 'PENDIENTE', 'PARCIAL'].includes(estadoPago)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const existing = await prisma.ingreso.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const montoPagado = estadoPago === 'PAGADO' ? existing.monto : estadoPago === 'PENDIENTE' ? 0 : existing.montoPagado

  const ingreso = await prisma.ingreso.update({
    where: { id: params.id },
    data: { estadoPago, montoPagado },
  })

  return NextResponse.json(ingreso)
}
