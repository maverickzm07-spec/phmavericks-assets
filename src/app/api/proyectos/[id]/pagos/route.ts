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

  const project = await prisma.clientProject.findUnique({
    where: { id: params.id },
    include: {
      ingresos: { select: { montoPagado: true } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  try {
    const body = await request.json()
    const data = pagoSchema.parse(body)

    const fechaPago = data.fechaPago ? new Date(data.fechaPago) : new Date()
    const totalPagadoAntes = project.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const precioRef = project.precioFinal ?? 0
    const saldoDisponible = precioRef > 0 ? Math.max(0, precioRef - totalPagadoAntes) : null

    // Si hay precio final definido, el pago no puede exceder el saldo pendiente
    const montoPago = saldoDisponible != null ? Math.min(data.monto, saldoDisponible + data.monto) : data.monto

    const ingreso = await prisma.ingreso.create({
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

    // Recalcular estado económico
    const totalPagadoNuevo = totalPagadoAntes + montoPago
    const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - totalPagadoNuevo) : null
    const estadoEconomico = precioRef <= 0 ? 'SIN_PRECIO'
      : totalPagadoNuevo <= 0 ? 'SIN_PAGO'
      : totalPagadoNuevo >= precioRef ? 'PAGADO'
      : 'ABONADO'

    return NextResponse.json({
      ingreso,
      resumen: {
        totalPagado: totalPagadoNuevo,
        saldoPendiente,
        estadoEconomico,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/proyectos/[id]/pagos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
