/**
 * Estados de producción de un proyecto.
 *
 * El flujo vigente tiene cuatro pasos. El estado de pago NO vive aquí: se
 * calcula desde los Ingreso del proyecto, de modo que un trabajo puede estar
 * ENTREGADO y seguir pendiente de cobro.
 */

export const ESTADOS_VIGENTES = ['CONFIRMADO', 'GRABADO', 'EN_EDICION', 'ENTREGADO'] as const
export type EstadoVigente = (typeof ESTADOS_VIGENTES)[number]

/** Estados de proyectos anteriores al cambio de flujo. No se ofrecen al crear. */
export const ESTADOS_LEGACY = ['PENDIENTE', 'EN_PROCESO', 'APROBADO', 'COMPLETADO', 'ATRASADO'] as const

/** Todos los valores que acepta el enum de la base. */
export const ESTADOS_PROYECTO = [...ESTADOS_VIGENTES, ...ESTADOS_LEGACY] as unknown as readonly [string, ...string[]]

export const ESTADO_LABELS: Record<string, string> = {
  CONFIRMADO: 'Confirmado',
  GRABADO: 'Grabado / realizado',
  EN_EDICION: 'En edición',
  ENTREGADO: 'Entregado',
  // Legacy
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  APROBADO: 'Aprobado',
  COMPLETADO: 'Completado',
  ATRASADO: 'Atrasado',
}

/** Estados que cuentan como trabajo aún abierto. */
export const ESTADOS_ACTIVOS = ['CONFIRMADO', 'GRABADO', 'EN_EDICION', 'PENDIENTE', 'EN_PROCESO', 'APROBADO']

/** Estados en los que el trabajo ya salió del taller. */
export const ESTADOS_CERRADOS = ['ENTREGADO', 'COMPLETADO']

export function etiquetaEstado(estado: string): string {
  return ESTADO_LABELS[estado] ?? estado
}

/** Estado económico derivado del precio y lo efectivamente cobrado. */
export type EstadoPago = 'SIN_PRECIO' | 'PENDIENTE' | 'ABONADO' | 'PAGADO'

export const PAGO_LABELS: Record<EstadoPago, string> = {
  SIN_PRECIO: 'Sin precio',
  PENDIENTE: 'Pendiente',
  ABONADO: 'Abonado parcialmente',
  PAGADO: 'Pagado',
}

export function calcularEstadoPago(precioFinal: number | null | undefined, totalPagado: number): EstadoPago {
  if (precioFinal == null || precioFinal <= 0) return 'SIN_PRECIO'
  if (totalPagado <= 0) return 'PENDIENTE'
  if (totalPagado >= precioFinal) return 'PAGADO'
  return 'ABONADO'
}
