/**
 * Cierre financiero histórico de PHMavericks.
 *
 * Aprobado el 9 de octubre de 2026. Las cifras de esta constante son el corte
 * verificado contra la base de producción y NO deben recalcularse: el cierre es
 * inmutable. Cualquier cobro posterior sobre una deuda anterior al corte se
 * registra aparte, conserva el saldo original y se clasifica como recuperación
 * de cartera histórica, nunca como una venta nueva.
 *
 * Documento del cierre: https://claude.ai/artifact/LNS9jB7ZRrtyU1wxKZF84N
 */

/** Momento exacto del corte, en hora de Ecuador (UTC−5). */
export const FECHA_CORTE_HISTORICO = new Date('2026-10-09T16:39:54-05:00')

export const CIERRE_HISTORICO = {
  fechaCorte: FECHA_CORTE_HISTORICO,
  zonaHoraria: 'America/Guayaquil',
  periodo: { desde: '2026-04-25', hasta: '2026-09-18' },

  /** Valor reconocible de la operación anterior al corte. */
  totalContratado: 4461.0,
  /** Dinero efectivamente recibido, según los movimientos registrados. */
  totalCobrado: 3636.0,
  /** Solo saldos positivos: un sobrecobro ajeno no cancela la deuda de un cliente. */
  cuentasPorCobrar: 875.0,

  composicion: [
    { concepto: 'Proyectos con precio', detalle: '13 de 33 proyectos', monto: 2555.0 },
    { concepto: 'Plan mensual', detalle: 'oro verde · jul 2026', monto: 150.0 },
    { concepto: 'Ingresos sin proyecto', detalle: '12 movimientos sueltos', monto: 1670.0 },
    { concepto: 'Cobros en proyectos sin precio', detalle: '3 proyectos', monto: 86.0 },
  ],

  ingresosPorMes: [
    { mes: '2026-04', etiqueta: 'Abril 2026', movimientos: 7, cobrado: 1015.0 },
    { mes: '2026-05', etiqueta: 'Mayo 2026', movimientos: 8, cobrado: 811.0 },
    { mes: '2026-06', etiqueta: 'Junio 2026', movimientos: 2, cobrado: 185.0 },
    { mes: '2026-07', etiqueta: 'Julio 2026', movimientos: 4, cobrado: 330.0 },
    { mes: '2026-08', etiqueta: 'Agosto 2026', movimientos: 8, cobrado: 1135.0 },
    { mes: '2026-09', etiqueta: 'Septiembre 2026', movimientos: 1, cobrado: 160.0 },
  ],

  /** Cartera viva al corte. El saldo original queda congelado. */
  carteraAlCorte: [
    { cliente: 'michele events', proyecto: 'BODA PREMIUM', contratado: 1300.0, cobrado: 650.0, saldoAlCorte: 650.0 },
    { cliente: 'raquel cevallos', proyecto: 'cumpleaños', contratado: 300.0, cobrado: 150.0, saldoAlCorte: 150.0 },
    { cliente: 'JONATHAN', proyecto: 'CONCIERTO FAUSTO MIÑO', contratado: 75.0, cobrado: 0.0, saldoAlCorte: 75.0 },
  ],

  /**
   * No hubo módulo de gastos antes del corte, así que no existe un resultado
   * neto histórico. Nunca presentar lo cobrado como utilidad.
   */
  gastosDocumentados: null as number | null,

  limitaciones: [
    'No existe resultado neto: no se registró ni un gasto antes del corte.',
    'Ningún movimiento tiene factura ni comprobante adjunto; el sistema no permitía archivos.',
    '20 de 33 proyectos no tienen valor contratado registrado.',
    'El total cobrado se validó por muestreo, no contra extractos bancarios.',
  ],

  respaldo: {
    archivo: 'phm_sistema-20261009-163954',
    sha256Dump: 'eca0ad1660a02633849937c95e9badb4286dcd5d58db3cab5e6b005fd9e2d47f',
    sha256Sql: '79cf1423cfb4a9cfdb406546cc8bf7fe3da891ad3bdb1875002fa79138402dd9',
    verificado: '13/13 tablas restauradas e idénticas',
  },
} as const

/** True si el registro pertenece a la etapa anterior al corte. */
export function esAnteriorAlCorte(fecha: Date | string): boolean {
  return new Date(fecha) <= FECHA_CORTE_HISTORICO
}
