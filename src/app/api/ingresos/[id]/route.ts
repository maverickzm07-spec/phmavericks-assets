import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteIngresos, canDeleteIngresos } from '@/lib/permissions'
import { z } from 'zod'

function calcEstado(monto: number, pagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (pagado <= 0) return 'PENDIENTE'
  if (pagado >= monto) return 'PAGADO'
  return 'PARCIAL'
}

const updateSchema = z.object({
  clienteId: z.string().optional().nullable(),
  tipoServicio: z.enum(['FOTOGRAFIA', 'REELS', 'VIDEOS_HORIZONTALES', 'IMAGENES_FLYERS', 'PLAN_MENSUAL', 'PERSONALIZADO']).optional(),
  descripcion: z.string().optional().nullable(),
  monto: z.number().positive().optional(),
  montoPagado: z.number().min(0).optional(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaIngreso: z.string().optional(),
  observaciones: z.string().optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const ingreso = await prisma.ingreso.findUnique({
    where: { id: params.id },
    include: {
      cliente: { select: { id: true, name: true, business: true } },
      creadoPorUser: { select: { name: true } },
      abonos: {
        include: { creadoPorUser: { select: { name: true } } },
        orderBy: { fechaAbono: 'asc' },
      },
    },
  })

  if (!ingreso) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({
    ...ingreso,
    saldoPendiente: Math.max(0, ingreso.monto - ingreso.montoPagado),
    porcentajePagado: ingreso.monto > 0 ? Math.min(100, Math.round((ingreso.montoPagado / ingreso.monto) * 100)) : 0,
  })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.ingreso.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const monto = data.monto ?? existing.monto
    const montoPagado = data.montoPagado !== undefined ? Math.min(data.montoPagado, monto) : existing.montoPagado
    const estadoPago = calcEstado(monto, montoPagado)

    const updateData: any = { ...data, estadoPago, montoPagado }
    if (data.fechaIngreso) updateData.fechaIngreso = new Date(data.fechaIngreso)

    const ingreso = await prisma.ingreso.update({
      where: { id: params.id },
      data: updateData,
      include: { cliente: { select: { id: true, name: true, business: true } } },
    })

    return NextResponse.json({
      ...ingreso,
      saldoPendiente: Math.max(0, ingreso.monto - ingreso.montoPagado),
      porcentajePagado: ingreso.monto > 0 ? Math.min(100, Math.round((ingreso.montoPagado / ingreso.monto) * 100)) : 0,
    })
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
  const existing = await prisma.ingreso.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const montoPagado = estadoPago === 'PAGADO' ? existing.monto : estadoPago === 'PENDIENTE' ? 0 : existing.montoPagado
  const ingreso = await prisma.ingreso.update({
    where: { id: params.id },
    data: { estadoPago, montoPagado },
  })
  return NextResponse.json(ingreso)
}
