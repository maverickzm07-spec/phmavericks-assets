import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

const pagoSchema = z.object({
  monto: z.number().positive('El monto debe ser mayor a 0'),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  observacion: z.string().optional().nullable(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = pagoSchema.parse(body)

    const fechaPago = data.fechaPago ? new Date(`${data.fechaPago}T12:00:00`) : new Date()

    // Leer saldo + validar tope + crear ingreso dentro de una transacción para
    // evitar sobrepagos y pagos duplicados por concurrencia / doble clic.
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.monthlyPlan.findUnique({
        where: { id: params.id },
        include: { ingresos: { select: { montoPagado: true } } },
      })
      if (!plan) return { status: 404 as const, error: 'Plan no encontrado' }

      const totalPagadoAntes = plan.ingresos.reduce((s, i) => s + i.montoPagado, 0)
      const precioRef = plan.precioFinal ?? plan.monthlyPrice

      // El pago no puede exceder el saldo pendiente cuando hay precio definido
      let montoPago = data.monto
      if (precioRef > 0) {
        const saldoDisponible = Math.max(0, precioRef - totalPagadoAntes)
        if (saldoDisponible <= 0) {
          return { status: 400 as const, error: 'El plan ya está saldado; no se pueden registrar más pagos.' }
        }
        montoPago = Math.min(data.monto, saldoDisponible)
      }

      const nombreMes = new Date(plan.year, plan.month - 1).toLocaleString('es', { month: 'long' })

      const ingreso = await tx.ingreso.create({
        data: {
          clienteId: plan.clientId,
          monthlyPlanId: plan.id,
          tipoServicio: 'PLAN_MENSUAL',
          descripcion: data.observacion || `Pago plan ${nombreMes} ${plan.year}`,
          monto: montoPago,
          montoPagado: montoPago,
          estadoPago: 'PAGADO',
          metodoPago: data.metodoPago || null,
          fechaIngreso: fechaPago,
          observaciones: data.observacion || null,
          creadoPor: user.userId,
        },
      })

      const totalPagadoNuevo = totalPagadoAntes + montoPago
      const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - totalPagadoNuevo) : null
      const estadoEconomico = precioRef <= 0 ? 'SIN_PRECIO'
        : totalPagadoNuevo <= 0 ? 'SIN_PAGO'
        : totalPagadoNuevo >= precioRef ? 'PAGADO'
        : 'ABONADO'

      return {
        status: 201 as const,
        ingreso,
        resumen: { totalPagado: totalPagadoNuevo, saldoPendiente, estadoEconomico },
      }
    })

    if (result.status !== 201) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ingreso: result.ingreso, resumen: result.resumen }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/planes/[id]/pagos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
