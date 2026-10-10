import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials } from '@/lib/permissions'
import { redondear } from '@/lib/finanzas'
import { ESTADOS_ACTIVOS } from '@/lib/projectStatus'

/**
 * Datos para los gráficos del dashboard.
 *
 * Un solo endpoint en lugar de que cada gráfico consulte por su cuenta: así
 * todas las visualizaciones de la pantalla hablan del mismo período y no
 * pueden contradecirse entre sí.
 *
 * Las cifras salen de las mismas reglas que Finanzas: lo cobrado es
 * `montoPagado` y solo los gastos pagados cuentan como salida de caja.
 */

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewFinancials(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const meses = Math.min(Math.max(Number(searchParams.get('meses')) || 6, 3), 12)

  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1)
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59)

  const [ingresos, gastos, categorias, proyectos] = await Promise.all([
    prisma.ingreso.findMany({
      where: { fechaIngreso: { gte: desde, lte: hasta } },
      select: { fechaIngreso: true, montoPagado: true },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lte: hasta }, estado: 'PAGADO' },
      select: { fecha: true, monto: true },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      select: { monto: true, categoria: { select: { nombre: true } } },
    }),
    prisma.clientProject.findMany({
      select: { estado: true, precioFinal: true, fechaEntrega: true, ingresos: { select: { montoPagado: true } } },
    }),
  ])

  // ── Serie mensual: ingresos y gastos sobre la misma escala ──
  const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const serie: { mes: string; etiqueta: string; ingresos: number; gastos: number }[] = []

  for (let i = 0; i < meses; i++) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1) + i, 1)
    serie.push({
      mes: clave(f),
      etiqueta: `${MESES[f.getMonth()]} ${String(f.getFullYear()).slice(-2)}`,
      ingresos: 0,
      gastos: 0,
    })
  }
  const indice = new Map(serie.map((s, i) => [s.mes, i]))

  for (const i of ingresos) {
    const pos = indice.get(clave(i.fechaIngreso))
    if (pos !== undefined) serie[pos].ingresos = redondear(serie[pos].ingresos + (i.montoPagado || 0))
  }
  for (const g of gastos) {
    const pos = indice.get(clave(g.fecha))
    if (pos !== undefined) serie[pos].gastos = redondear(serie[pos].gastos + g.monto)
  }

  // ── Distribución de gastos. Más de cinco categorías se agrupan en "Otras":
  // una dona con ocho porciones deja de leerse de un vistazo.
  const porCategoria = new Map<string, number>()
  for (const g of categorias) {
    porCategoria.set(g.categoria.nombre, redondear((porCategoria.get(g.categoria.nombre) ?? 0) + g.monto))
  }
  const ordenadas = Array.from(porCategoria.entries()).sort((a, b) => b[1] - a[1])
  const distribucion = ordenadas.slice(0, 5).map(([nombre, valor]) => ({ nombre, valor }))
  const resto = ordenadas.slice(5).reduce((s, [, v]) => s + v, 0)
  if (resto > 0) distribucion.push({ nombre: 'Otras', valor: redondear(resto) })

  // ── Métricas de avance para los anillos ──
  const enProduccion = proyectos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado)).length
  const conFechaEntrega = proyectos.filter((p) => p.fechaEntrega)
  const entregados = conFechaEntrega.filter((p) => ['ENTREGADO', 'COMPLETADO'].includes(p.estado)).length

  const contratadoVivo = proyectos
    .filter((p) => p.precioFinal && p.precioFinal > 0)
    .reduce((s, p) => s + (p.precioFinal ?? 0), 0)
  const cobradoVivo = proyectos.reduce((s, p) => s + p.ingresos.reduce((x, i) => x + i.montoPagado, 0), 0)

  const mesActual = serie[serie.length - 1] ?? { ingresos: 0, gastos: 0 }
  const mesesConDatos = serie.filter((s) => s.ingresos > 0)
  // La meta se deduce del propio historial, no se inventa: el promedio de los
  // meses con movimiento. Sin historial no hay meta y el anillo lo dice.
  const metaMensual = mesesConDatos.length > 0
    ? redondear(mesesConDatos.reduce((s, m) => s + m.ingresos, 0) / mesesConDatos.length)
    : null

  return NextResponse.json({
    periodo: { meses, desde: clave(desde), hasta: clave(hasta) },
    serie,
    distribucionGastos: distribucion,
    avance: {
      cobradoMes: mesActual.ingresos,
      metaMensual,
      // Porcentaje de cobro sobre lo contratado de los proyectos vivos
      cobranza: contratadoVivo > 0 ? Math.min(100, Math.round((cobradoVivo / contratadoVivo) * 100)) : null,
      contratadoVivo: redondear(contratadoVivo),
      cobradoVivo: redondear(cobradoVivo),
      enProduccion,
      // Entregas cumplidas sobre las comprometidas
      cumplimientoEntregas: conFechaEntrega.length > 0
        ? Math.round((entregados / conFechaEntrega.length) * 100)
        : null,
      entregasComprometidas: conFechaEntrega.length,
      entregasCumplidas: entregados,
    },
    // Para que la vista sepa si enseñar gráficos o un estado vacío honesto.
    hayDatos: serie.some((s) => s.ingresos > 0 || s.gastos > 0),
  })
}
