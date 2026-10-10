import { prisma } from '@/lib/prisma'
import { calcularCartera } from '@/lib/cartera'
import { FECHA_CORTE_HISTORICO } from '@/lib/historico'

/**
 * Fuente única del resumen financiero de un período.
 *
 * La usan tanto Finanzas como el Dashboard. Antes cada pantalla hacía su propia
 * consulta —el dashboard sin límite superior de fecha, Finanzas con rango
 * cerrado— y bastaba un ingreso con fecha futura para que mostraran cifras
 * distintas del mismo mes.
 *
 * Dos reglas que no cambian:
 *  - El dinero cobrado sale de `Ingreso.montoPagado`; los abonos son su
 *    desglose y nunca se suman aparte.
 *  - Solo los gastos PAGADOS afectan el resultado; los pendientes son cuentas
 *    por pagar, no salida de caja.
 */

export function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

/** Primer y último instante del mes que contiene a `fecha`. */
export function rangoDelMes(fecha = new Date()) {
  return {
    inicio: new Date(fecha.getFullYear(), fecha.getMonth(), 1),
    fin: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59),
  }
}

export interface ResumenFinanciero {
  ingresosCobrados: number
  /** Cobros de trabajos posteriores al cierre histórico. */
  ingresosNuevos: number
  /** Cobros de deudas anteriores al cierre: entran a caja, no son venta nueva. */
  cobrosCarteraHistorica: number
  gastosPagados: number
  resultadoOperativo: number
  cuentasPorCobrar: number
  cuentasPorPagar: number
  clientesConDeuda: number
}

export async function calcularResumenFinanciero(inicio: Date, fin: Date): Promise<ResumenFinanciero> {
  const [ingresos, gastos, cartera, pendientes, proyectosPrevios] = await Promise.all([
    prisma.ingreso.findMany({
      where: { fechaIngreso: { gte: inicio, lte: fin } },
      select: { montoPagado: true, projectId: true },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: inicio, lte: fin }, estado: 'PAGADO' },
      select: { monto: true },
    }),
    calcularCartera(),
    prisma.gasto.aggregate({ where: { estado: 'PENDIENTE' }, _sum: { monto: true } }),
    // Proyectos anteriores al corte: sus cobros son recuperación de cartera.
    prisma.clientProject.findMany({
      where: { createdAt: { lte: FECHA_CORTE_HISTORICO } },
      select: { id: true },
    }),
  ])

  const historicos = new Set(proyectosPrevios.map((p) => p.id))

  let cobradoNuevo = 0
  let cobradoHistorico = 0
  for (const i of ingresos) {
    const monto = i.montoPagado || 0
    if (i.projectId && historicos.has(i.projectId)) cobradoHistorico += monto
    else cobradoNuevo += monto
  }

  const gastosPagados = gastos.reduce((s, g) => s + g.monto, 0)
  const cobradoTotal = cobradoNuevo + cobradoHistorico

  return {
    ingresosCobrados: redondear(cobradoTotal),
    ingresosNuevos: redondear(cobradoNuevo),
    cobrosCarteraHistorica: redondear(cobradoHistorico),
    gastosPagados: redondear(gastosPagados),
    resultadoOperativo: redondear(cobradoTotal - gastosPagados),
    cuentasPorCobrar: cartera.total,
    cuentasPorPagar: redondear(pendientes._sum.monto ?? 0),
    clientesConDeuda: cartera.clientesDeudores.size,
  }
}
