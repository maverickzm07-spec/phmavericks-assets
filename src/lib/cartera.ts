import { prisma } from '@/lib/prisma'

/**
 * Fuente de verdad única de la cartera por cobrar.
 *
 * La deuda de un proyecto o plan NO vive en el saldo del Ingreso: el puente económico
 * crea un Ingreso ya PAGADO por cada cobro, así que el saldo real es
 * `precio de referencia − Σ montoPagado de sus Ingreso`.
 *
 * Solo se acumulan saldos positivos: un sobrecobro en un proyecto no cancela la deuda
 * de otro cliente, por lo que nunca se compensan entre sí.
 */

export interface ProyectoCartera {
  clientId: string
  precioFinal: number | null
  ingresos: { montoPagado: number }[]
}

export interface PlanCartera {
  clientId: string
  precioFinal: number | null
  monthlyPrice: number
  ingresos: { montoPagado: number }[]
}

/** Campos mínimos que deben pedirse a Prisma para calcular la cartera de proyectos. */
export const SELECT_PROYECTO_CARTERA = {
  clientId: true,
  precioFinal: true,
  ingresos: { select: { montoPagado: true } },
} as const

/** Campos mínimos que deben pedirse a Prisma para calcular la cartera de planes. */
export const SELECT_PLAN_CARTERA = {
  clientId: true,
  precioFinal: true,
  monthlyPrice: true,
  ingresos: { select: { montoPagado: true } },
} as const

function redondear(valor: number) {
  return Math.round(valor * 100) / 100
}

/** Saldo pendiente de un proyecto. Devuelve 0 si no tiene precio de referencia. */
export function saldoProyecto(p: ProyectoCartera): number {
  const referencia = p.precioFinal ?? 0
  if (referencia <= 0) return 0
  const pagado = p.ingresos.reduce((suma, i) => suma + i.montoPagado, 0)
  return Math.max(0, referencia - pagado)
}

/** Saldo pendiente de un plan mensual. Usa precioFinal y cae a monthlyPrice (legacy). */
export function saldoPlan(p: PlanCartera): number {
  const referencia = p.precioFinal ?? p.monthlyPrice ?? 0
  if (referencia <= 0) return 0
  const pagado = p.ingresos.reduce((suma, i) => suma + i.montoPagado, 0)
  return Math.max(0, referencia - pagado)
}

export interface Cartera {
  deudaProyectos: number
  deudaPlanes: number
  /** Suma de ambas deudas, redondeada a dos decimales. */
  total: number
  /** Ids de clientes con al menos un saldo pendiente. */
  clientesDeudores: Set<string>
}

/**
 * Calcula la cartera a partir de colecciones ya consultadas.
 * Útil cuando el endpoint ya trae los datos en su propio Promise.all.
 */
export function calcularCarteraDesde(proyectos: ProyectoCartera[], planes: PlanCartera[]): Cartera {
  const clientesDeudores = new Set<string>()

  const deudaProyectos = proyectos.reduce((suma, p) => {
    const saldo = saldoProyecto(p)
    if (saldo > 0 && p.clientId) clientesDeudores.add(p.clientId)
    return suma + saldo
  }, 0)

  const deudaPlanes = planes.reduce((suma, p) => {
    const saldo = saldoPlan(p)
    if (saldo > 0 && p.clientId) clientesDeudores.add(p.clientId)
    return suma + saldo
  }, 0)

  return {
    deudaProyectos: redondear(deudaProyectos),
    deudaPlanes: redondear(deudaPlanes),
    total: redondear(deudaProyectos + deudaPlanes),
    clientesDeudores,
  }
}

/** Consulta la base y devuelve la cartera completa. */
export async function calcularCartera(): Promise<Cartera> {
  const [proyectos, planes] = await Promise.all([
    prisma.clientProject.findMany({
      where: { precioFinal: { gt: 0 } },
      select: SELECT_PROYECTO_CARTERA,
    }),
    prisma.monthlyPlan.findMany({ select: SELECT_PLAN_CARTERA }),
  ])
  return calcularCarteraDesde(proyectos, planes)
}
