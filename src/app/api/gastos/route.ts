import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewIngresos, canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

const gastoSchema = z.object({
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  concepto: z.string().min(1, 'El concepto es obligatorio').max(200),
  categoriaId: z.string().min(1, 'La categoría es obligatoria'),
  monto: z.number().positive('El valor debe ser mayor que cero'),
  proveedor: z.string().max(120).optional().nullable(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).optional().nullable(),
  estado: z.enum(['PAGADO', 'PENDIENTE']).default('PAGADO'),
  projectId: z.string().optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
})

/** Una fecha suelta se fija a mediodía para que no cambie de día entre husos. */
function normalizarFecha(valor: string): Date {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  return new Date(soloFecha ? `${valor}T12:00:00` : valor)
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const categoriaId = searchParams.get('categoriaId')
  const projectId = searchParams.get('projectId')
  const estado = searchParams.get('estado')
  // 'proyecto' = solo gastos con proyecto; 'general' = solo gastos sin proyecto
  const ambito = searchParams.get('ambito')

  const where: any = {
    ...(categoriaId ? { categoriaId } : {}),
    ...(estado ? { estado: estado as 'PAGADO' | 'PENDIENTE' } : {}),
    ...(projectId ? { projectId } : {}),
    ...(ambito === 'proyecto' ? { projectId: { not: null } } : {}),
    ...(ambito === 'general' ? { projectId: null } : {}),
  }
  if (desde || hasta) {
    where.fecha = {
      ...(desde ? { gte: normalizarFecha(desde) } : {}),
      ...(hasta ? { lte: new Date(`${hasta}T23:59:59`) } : {}),
    }
  }

  const gastos = await prisma.gasto.findMany({
    where,
    include: {
      categoria: { select: { id: true, nombre: true } },
      project: { select: { id: true, nombre: true, client: { select: { name: true } } } },
      creadoPorUser: { select: { name: true } },
      _count: { select: { documentos: true } },
    },
    orderBy: { fecha: 'desc' },
  })

  // El resultado del período se mide con los gastos efectivamente pagados;
  // los pendientes son cuentas por pagar, no salida de caja.
  const pagados = gastos.filter((g) => g.estado === 'PAGADO')
  const pendientes = gastos.filter((g) => g.estado === 'PENDIENTE')
  const redondear = (n: number) => Math.round(n * 100) / 100

  const porCategoria: Record<string, { nombre: string; total: number; cantidad: number }> = {}
  for (const g of gastos) {
    const clave = g.categoria.id
    if (!porCategoria[clave]) porCategoria[clave] = { nombre: g.categoria.nombre, total: 0, cantidad: 0 }
    porCategoria[clave].total = redondear(porCategoria[clave].total + g.monto)
    porCategoria[clave].cantidad += 1
  }

  return NextResponse.json({
    gastos,
    totales: {
      total: redondear(gastos.reduce((s, g) => s + g.monto, 0)),
      pagado: redondear(pagados.reduce((s, g) => s + g.monto, 0)),
      porPagar: redondear(pendientes.reduce((s, g) => s + g.monto, 0)),
      porProyecto: redondear(gastos.filter((g) => g.projectId).reduce((s, g) => s + g.monto, 0)),
      generales: redondear(gastos.filter((g) => !g.projectId).reduce((s, g) => s + g.monto, 0)),
      cantidad: gastos.length,
      sinComprobante: gastos.filter((g) => g._count.documentos === 0).length,
    },
    porCategoria: Object.values(porCategoria).sort((a, b) => b.total - a.total),
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos para registrar gastos' }, { status: 403 })

  try {
    const data = gastoSchema.parse(await request.json())

    const categoria = await prisma.categoriaGasto.findUnique({ where: { id: data.categoriaId }, select: { id: true } })
    if (!categoria) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })

    if (data.projectId) {
      const proyecto = await prisma.clientProject.findUnique({ where: { id: data.projectId }, select: { id: true } })
      if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const gasto = await prisma.gasto.create({
      data: {
        fecha: normalizarFecha(data.fecha),
        concepto: data.concepto.trim(),
        categoriaId: data.categoriaId,
        monto: data.monto,
        proveedor: data.proveedor?.trim() || null,
        metodoPago: data.metodoPago || null,
        estado: data.estado,
        projectId: data.projectId || null,
        observaciones: data.observaciones?.trim() || null,
        creadoPor: user.userId,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        project: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(gasto, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/gastos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
