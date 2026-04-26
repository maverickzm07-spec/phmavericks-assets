import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewIngresos, canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

const createSchema = z.object({
  clienteId: z.string().optional().nullable(),
  tipoServicio: z.enum(['FOTOGRAFIA', 'REELS', 'VIDEOS_HORIZONTALES', 'IMAGENES_FLYERS', 'PLAN_MENSUAL', 'PERSONALIZADO']),
  descripcion: z.string().optional(),
  monto: z.number().positive(),
  montoPagado: z.number().min(0).default(0),
  estadoPago: z.enum(['PAGADO', 'PENDIENTE', 'PARCIAL']).default('PENDIENTE'),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaIngreso: z.string().optional(),
  observaciones: z.string().optional(),
})

function startOf(unit: 'hoy' | 'semana' | 'mes' | 'anio') {
  const now = new Date()
  if (unit === 'hoy') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (unit === 'semana') {
    const d = new Date(now)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (unit === 'mes') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(now.getFullYear(), 0, 1)
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const periodo = searchParams.get('periodo') || ''
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const where: any = {}
  if (tipo) where.tipoServicio = tipo
  if (periodo === 'rango' && desde && hasta) {
    where.fechaIngreso = { gte: new Date(desde), lte: new Date(hasta + 'T23:59:59') }
  } else if (periodo && periodo !== 'rango') {
    where.fechaIngreso = { gte: startOf(periodo as any) }
  }

  const [ingresos, allIngresos] = await Promise.all([
    prisma.ingreso.findMany({
      where,
      include: {
        cliente: { select: { id: true, name: true, business: true } },
        creadoPorUser: { select: { name: true } },
      },
      orderBy: { fechaIngreso: 'desc' },
    }),
    prisma.ingreso.findMany({
      select: { estadoPago: true, monto: true, montoPagado: true, fechaIngreso: true },
    }),
  ])

  const cobrado = (i: any) => i.estadoPago !== 'PENDIENTE' ? (i.montoPagado || 0) : 0
  const hoyStart = startOf('hoy')
  const semanaStart = startOf('semana')
  const mesStart = startOf('mes')
  const anioStart = startOf('anio')

  const totales = {
    hoy: allIngresos.filter(i => new Date(i.fechaIngreso) >= hoyStart).reduce((s, i) => s + cobrado(i), 0),
    semana: allIngresos.filter(i => new Date(i.fechaIngreso) >= semanaStart).reduce((s, i) => s + cobrado(i), 0),
    mes: allIngresos.filter(i => new Date(i.fechaIngreso) >= mesStart).reduce((s, i) => s + cobrado(i), 0),
    anio: allIngresos.filter(i => new Date(i.fechaIngreso) >= anioStart).reduce((s, i) => s + cobrado(i), 0),
    total: allIngresos.reduce((s, i) => s + cobrado(i), 0),
    pendiente: allIngresos.filter(i => i.estadoPago !== 'PAGADO').reduce((s, i) => s + (i.monto - (i.montoPagado || 0)), 0),
  }

  const totalFiltrado = ingresos.reduce((s, i) => s + cobrado(i), 0)

  return NextResponse.json({ ingresos, totales, totalFiltrado })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    let montoPagado = data.montoPagado
    if (data.estadoPago === 'PAGADO') montoPagado = data.monto
    if (data.estadoPago === 'PENDIENTE') montoPagado = 0

    const ingreso = await prisma.ingreso.create({
      data: {
        clienteId: data.clienteId || null,
        tipoServicio: data.tipoServicio,
        descripcion: data.descripcion || null,
        monto: data.monto,
        montoPagado,
        estadoPago: data.estadoPago,
        metodoPago: data.metodoPago || null,
        fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : new Date(),
        observaciones: data.observaciones || null,
        creadoPor: user.userId,
      },
      include: {
        cliente: { select: { id: true, name: true, business: true } },
        creadoPorUser: { select: { name: true } },
      },
    })

    return NextResponse.json(ingreso, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
