import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

function calcEstado(monto: number, pagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (pagado <= 0) return 'PENDIENTE'
  if (pagado >= monto) return 'PAGADO'
  return 'PARCIAL'
}

const abonoSchema = z.object({
  monto: z.number().positive(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaAbono: z.string().optional(),
  observacion: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const abonos = await prisma.abono.findMany({
    where: { ingresoId: params.id },
    include: { creadoPorUser: { select: { name: true } } },
    orderBy: { fechaAbono: 'asc' },
  })

  return NextResponse.json(abonos)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = abonoSchema.parse(body)

    const fechaAbono = data.fechaAbono ? new Date(`${data.fechaAbono}T12:00:00`) : new Date()

    // Releer el ingreso, topar el abono al saldo real y actualizar, todo en una
    // sola transacción para que el historial de abonos siempre cuadre con montoPagado.
    const result = await prisma.$transaction(async (tx) => {
      const ingreso = await tx.ingreso.findUnique({ where: { id: params.id } })
      if (!ingreso) return { status: 404 as const, error: 'Ingreso no encontrado' }

      const saldoActual = Math.max(0, ingreso.monto - ingreso.montoPagado)
      if (saldoActual <= 0) {
        return { status: 400 as const, error: 'El ingreso ya está totalmente pagado.' }
      }

      // Tope real: el abono no puede exceder el saldo pendiente
      const nuevoAbono = Math.min(data.monto, saldoActual)
      const nuevoMontoPagado = ingreso.montoPagado + nuevoAbono
      const nuevoEstado = calcEstado(ingreso.monto, nuevoMontoPagado)

      const abono = await tx.abono.create({
        data: {
          ingresoId: params.id,
          monto: nuevoAbono,
          metodoPago: data.metodoPago || null,
          fechaAbono,
          observacion: data.observacion || null,
          creadoPor: user.userId,
        },
        include: { creadoPorUser: { select: { name: true } } },
      })

      await tx.ingreso.update({
        where: { id: params.id },
        data: { montoPagado: nuevoMontoPagado, estadoPago: nuevoEstado },
      })

      return {
        status: 201 as const,
        abono,
        ingreso: {
          montoPagado: nuevoMontoPagado,
          estadoPago: nuevoEstado,
          saldoPendiente: Math.max(0, ingreso.monto - nuevoMontoPagado),
          porcentajePagado: Math.min(100, Math.round((nuevoMontoPagado / ingreso.monto) * 100)),
        },
      }
    })

    if (result.status !== 201) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ abono: result.abono, ingreso: result.ingreso }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
