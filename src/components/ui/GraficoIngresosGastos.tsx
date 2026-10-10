'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

/**
 * Ingresos cobrados frente a gastos pagados, mes a mes.
 *
 * Las dos series comparten una sola escala: son la misma magnitud en dólares y
 * ponerles ejes distintos haría parecer comparables cosas que no lo son.
 * El color es semántico, no decorativo: verde lo que entra, ámbar lo que sale.
 */

export interface PuntoMes {
  etiqueta: string
  ingresos: number
  gastos: number
}

const VERDE = '#3FB97F'
const AMBAR = '#E0A33C'

export default function GraficoIngresosGastos({ datos }: { datos: PuntoMes[] }) {
  const [activo, setActivo] = useState<number | null>(null)

  if (datos.length === 0) return null

  const maximo = Math.max(1, ...datos.flatMap((d) => [d.ingresos, d.gastos]))
  // Se redondea hacia arriba para que la línea superior sea una cifra legible.
  const tope = Math.ceil(maximo / 100) * 100 || 100

  const alto = 170
  const margenY = 22
  const utilAlto = alto - margenY
  const anchoCol = 100 / datos.length

  const altura = (v: number) => (v / tope) * utilAlto

  return (
    <div className="relative">
      {/* Leyenda: con dos series, el color por sí solo no basta. */}
      <div className="mb-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11.5px] text-phm-gray">
          <span className="h-2 w-2 rounded-sm" style={{ background: VERDE }} /> Cobrado
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-phm-gray">
          <span className="h-2 w-2 rounded-sm" style={{ background: AMBAR }} /> Gastos pagados
        </span>
      </div>

      <div className="relative" style={{ height: alto }}>
        {/* Rejilla recesiva, con la escala a la izquierda */}
        {[1, 0.5, 0].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ bottom: f * utilAlto }}
          >
            <span className="w-9 flex-none text-right text-[9.5px] tabular text-phm-gray-soft">
              {tope * f >= 1000 ? `${Math.round((tope * f) / 1000)}k` : Math.round(tope * f)}
            </span>
            <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,.055)' }} />
          </div>
        ))}

        {/* Columnas */}
        <div className="absolute inset-y-0 left-11 right-0 flex items-end">
          {datos.map((d, i) => (
            <div
              key={d.etiqueta}
              className="group relative flex h-full flex-1 items-end justify-center gap-[3px]"
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
            >
              <div
                className="w-[38%] max-w-[18px] rounded-t-[4px] transition-opacity"
                style={{
                  height: Math.max(d.ingresos > 0 ? 3 : 0, altura(d.ingresos)),
                  background: VERDE,
                  opacity: activo === null || activo === i ? 0.9 : 0.35,
                }}
              />
              <div
                className="w-[38%] max-w-[18px] rounded-t-[4px] transition-opacity"
                style={{
                  height: Math.max(d.gastos > 0 ? 3 : 0, altura(d.gastos)),
                  background: AMBAR,
                  opacity: activo === null || activo === i ? 0.9 : 0.35,
                }}
              />

              {activo === i && (
                <div
                  className="pointer-events-none absolute bottom-full z-10 mb-2 w-max -translate-x-1/2 rounded-xl border border-white/[0.12] bg-phm-g2 px-3 py-2 shadow-premium"
                  style={{ left: '50%' }}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-phm-gray-soft">{d.etiqueta}</p>
                  <p className="flex items-center gap-1.5 text-[12px] text-white">
                    <span className="h-1.5 w-1.5 rounded-sm" style={{ background: VERDE }} />
                    <span className="tabular">{formatCurrency(d.ingresos)}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-[12px] text-white">
                    <span className="h-1.5 w-1.5 rounded-sm" style={{ background: AMBAR }} />
                    <span className="tabular">{formatCurrency(d.gastos)}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Meses */}
      <div className="ml-11 mt-2 flex">
        {datos.map((d) => (
          <span key={d.etiqueta} className="flex-1 text-center text-[9.5px] text-phm-gray-soft">
            {d.etiqueta}
          </span>
        ))}
      </div>
    </div>
  )
}
