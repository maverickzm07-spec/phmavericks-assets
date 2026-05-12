import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewIngresos, canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

const createSchema = z.object({
  clienteId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  monthlyPlanId: z.string().optional().nullable(),
  tipoServicio: z.enum(['FOTOGRAFIA', 'REELS', 'VIDEOS_HORIZONTALES', 'IMAGENES_FLYERS', 'PLAN_MENSUAL', 'PERSONALIZADO']),
  descripcion: z.string().optional(),
  monto: z.number().positive(),
  montoPagado: z.number().min(0).default(0),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  fechaIngreso: z.string().optional(),
  observaciones: z.string().optional(),
})

function calcEstado(monto: number, pagado: number): 'PAGADO' | 'PARCIAL' | 'PENDIENTE' {
  if (pagado <= 0) return 'PENDIENTE'
  if (pagado >= monto) return 'PAGADO'
  return 'PARCIAL'
}

function startOf(unit: 'hoy' | 'semana' | 'mes' | 'anio'): Date {
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
  const estadoFilter = searchParams.get('estado')
  const periodo = searchParams.get('periodo') || ''
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const clienteId = searchParams.get('clienteId')

  const where: any = {}
  if (tipo) where.tipoServicio = tipo
  if (estadoFilter) where.estadoPago = estadoFilter
  if (clienteId) where.clienteId = clienteId
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
        project: { select: { id: true, nombre: true } },
        monthlyPlan: { select: { id: true, month: true, year: true } },
        creadoPorUser: { select: { name: true } },
        abonos: { orderBy: { fechaAbono: 'desc' }, take: 1 },
        _count: { select: { abonos: true } },
      },
      orderBy: { fechaIngreso: 'desc' },
    }),
    prisma.ingreso.findMany({
      select: { estadoPago: true, monto: true, montoPagado: true, fechaIngreso: true, clienteId: true },
    }),
  ])

  const cobrado = (i: any) => i.estadoPago !== 'PENDIENTE' ? (i.montoPagado || 0) : 0
  const hoyStart = startOf('hoy')
  const semanaStart = startOf('semana')
  const mesStart = startOf('mes')
  const anioStart = startOf('anio')

  const clientesConDeuda = new Set(
    allIngresos
      .filter(i => i.estadoPago !== 'PAGADO' && i.clienteId)
      .map(i => i.clienteId)
  ).size

  const totales = {
    hoy: allIngresos.filter(i => new Date(i.fechaIngreso) >= hoyStart).reduce((s, i) => s + cobrado(i), 0),
    semana: allIngresos.filter(i => new Date(i.fechaIngreso) >= semanaStart).reduce((s, i) => s + cobrado(i), 0),
    mes: allIngresos.filter(i => new Date(i.fechaIngreso) >= mesStart).reduce((s, i) => s + cobrado(i), 0),
    anio: allIngresos.filter(i => new Date(i.fechaIngreso) >= anioStart).reduce((s, i) => s + cobrado(i), 0),
    total: allIngresos.reduce((s, i) => s + cobrado(i), 0),
    pendiente: allIngresos.filter(i => i.estadoPago !== 'PAGADO').reduce((s, i) => s + (i.monto - (i.montoPagado || 0)), 0),
    pagosCompletos: allIngresos.filter(i => i.estadoPago === 'PAGADO').length,
    pagosParcialesCount: allIngresos.filter(i => i.estadoPago === 'PARCIAL').length,
    clientesConDeuda,
  }

  const ingresosConCalc = ingresos.map(i => ({
    ...i,
    saldoPendiente: Math.max(0, i.monto - i.montoPagado),
    porcentajePagado: i.monto > 0 ? Math.min(100, Math.round((i.montoPagado / i.monto) * 100)) : 0,
  }))

  const totalFiltrado = ingresosConCalc.reduce((s, i) => s + cobrado(i), 0)
  const pendienteFiltrado = ingresosConCalc.filter(i => i.estadoPago !== 'PAGADO').reduce((s, i) => s + i.saldoPendiente, 0)

  return NextResponse.json({ ingresos: ingresosConCalc, totales, totalFiltrado, pendienteFiltrado })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const montoPagado = Math.min(data.montoPagado, data.monto)
    const estadoPago = calcEstado(data.monto, montoPagado)

    const ingreso = await prisma.ingreso.create({
      data: {
        clienteId: data.clienteId || null,
        projectId: data.projectId || null,
        monthlyPlanId: data.monthlyPlanId || null,
        tipoServicio: data.tipoServicio,
        descripcion: data.descripcion || null,
        monto: data.monto,
        montoPagado,
        estadoPago,
        metodoPago: data.metodoPago || null,
        fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : new Date(),
        observaciones: data.observaciones || null,
        creadoPor: user.userId,
      },
      include: {
        cliente: { select: { id: true, name: true, business: true } },
        project: { select: { id: true, nombre: true } },
        monthlyPlan: { select: { id: true, month: true, year: true } },
      },
    })

    // Si se abonó algo al crear, registrar como primer abono
    if (montoPagado > 0 && data.metodoPago) {
      await prisma.abono.create({
        data: {
          ingresoId: ingreso.id,
          monto: montoPagado,
          metodoPago: data.metodoPago,
          fechaAbono: data.fechaIngreso ? new Date(data.fechaIngreso) : new Date(),
          creadoPor: user.userId,
        },
      })
    }

    return NextResponse.json({ ...ingreso, saldoPendiente: ingreso.monto - montoPagado, porcentajePagado: Math.round((montoPagado / ingreso.monto) * 100) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
