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

function calcEstado(precioFinal: number, totalPagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (totalPagado <= 0) return 'PENDIENTE'
  if (totalPagado >= precioFinal) return 'PAGADO'
  return 'PARCIAL'
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = pagoSchema.parse(body)

    const fechaPago = data.fechaPago ? new Date(`${data.fechaPago}T12:00:00`) : new Date()

    // Toda la lógica (leer saldo + validar tope + crear ingreso) va en una transacción
    // para evitar sobrepagos y pagos duplicados por peticiones concurrentes / doble clic.
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.clientProject.findUnique({
        where: { id: params.id },
        include: { ingresos: { select: { montoPagado: true } } },
      })
      if (!project) return { status: 404 as const, error: 'Proyecto no encontrado' }

      const totalPagadoAntes = project.ingresos.reduce((s, i) => s + i.montoPagado, 0)
      const precioRef = project.precioFinal ?? 0

      // Si hay precio final definido, el pago no puede exceder el saldo pendiente
      let montoPago = data.monto
      if (precioRef > 0) {
        const saldoDisponible = Math.max(0, precioRef - totalPagadoAntes)
        if (saldoDisponible <= 0) {
          return { status: 400 as const, error: 'El proyecto ya está saldado; no se pueden registrar más pagos.' }
        }
        montoPago = Math.min(data.monto, saldoDisponible)
      }

      const ingreso = await tx.ingreso.create({
        data: {
          clienteId: project.clientId,
          projectId: project.id,
          tipoServicio: 'PERSONALIZADO',
          descripcion: data.observacion || `Pago proyecto: ${project.nombre}`,
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
    console.error('[POST /api/proyectos/[id]/pagos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
