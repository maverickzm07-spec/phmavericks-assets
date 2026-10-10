import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials } from '@/lib/permissions'
import { calcularResumenFinanciero, redondear } from '@/lib/finanzas'
import { FECHA_CORTE_HISTORICO } from '@/lib/historico'

/**
 * Resumen financiero de la empresa.
 *
 * Dos principios que rigen todos los números de aquí:
 *  - El dinero cobrado sale de `Ingreso.montoPagado`; los abonos son su desglose
 *    y nunca se suman aparte.
 *  - Una cuenta pendiente no es efectivo: cobrado y contratado van separados.
 */


/** Rango del mes en curso, o el que llegue por parámetros. */
function resolverRango(searchParams: URLSearchParams) {
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  if (desde && hasta) {
    return { inicio: new Date(`${desde}T00:00:00`), fin: new Date(`${hasta}T23:59:59`) }
  }
  const hoy = new Date()
  return {
    inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    fin: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59),
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewFinancials(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const { inicio, fin } = resolverRango(searchParams)

  // El resumen sale del helper compartido para que Dashboard y Finanzas no
  // puedan mostrar cifras distintas del mismo período.
  const [resumen, gastosPeriodo, proyectos] = await Promise.all([
    calcularResumenFinanciero(inicio, fin),
    prisma.gasto.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      select: { monto: true, estado: true, projectId: true, categoria: { select: { nombre: true } } },
    }),
    prisma.clientProject.findMany({
      select: {
        id: true, nombre: true, estado: true, precioFinal: true, createdAt: true,
        client: { select: { name: true } },
        ingresos: { select: { montoPagado: true } },
        gastos: { select: { monto: true, estado: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const proyectosHistoricos = new Set(
    proyectos.filter((p) => p.createdAt <= FECHA_CORTE_HISTORICO).map((p) => p.id),
  )

  const gastosPorCategoria: Record<string, number> = {}
  for (const g of gastosPeriodo) {
    gastosPorCategoria[g.categoria.nombre] = redondear((gastosPorCategoria[g.categoria.nombre] ?? 0) + g.monto)
  }

  // Rentabilidad por proyecto. Se distinguen dos lecturas que no deben mezclarse:
  // la de caja (cobrado − gastos pagados) y el margen sobre el valor contratado.
  const porProyecto = proyectos.map((p) => {
    const cobrado = p.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const gastosTotales = p.gastos.reduce((s, g) => s + g.monto, 0)
    const gastosPagadosProy = p.gastos.filter((g) => g.estado === 'PAGADO').reduce((s, g) => s + g.monto, 0)
    const contratado = p.precioFinal ?? 0
    return {
      id: p.id,
      nombre: p.nombre,
      cliente: p.client?.name ?? null,
      estado: p.estado,
      contratado: redondear(contratado),
      cobrado: redondear(cobrado),
      saldoPendiente: contratado > 0 ? redondear(Math.max(0, contratado - cobrado)) : null,
      gastos: redondear(gastosTotales),
      // Lo que realmente entró menos lo realmente pagado
      resultadoCaja: redondear(cobrado - gastosPagadosProy),
      // Margen teórico si se cobrara todo lo contratado
      margenSobreContratado: contratado > 0 ? redondear(contratado - gastosTotales) : null,
      esHistorico: proyectosHistoricos.has(p.id),
    }
  })

  // El rango se etiqueta con la fecha local, no con toISOString: el último día
  // del mes a las 23:59 se convertiría en el día 1 del mes siguiente en UTC.
  const comoFecha = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return NextResponse.json({
    periodo: { desde: comoFecha(inicio), hasta: comoFecha(fin) },
    resumen,
    gastosPorCategoria: Object.entries(gastosPorCategoria)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total),
    porProyecto,
  })
}
