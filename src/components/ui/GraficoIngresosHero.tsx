'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

/**
 * Gráfica de ingresos del bloque principal.
 *
 * No reutiliza Sparkline a propósito: ese componente estira el viewBox con
 * `preserveAspectRatio="none"` y a este tamaño el trazo se deforma. Aquí la
 * geometría se calcula sobre un viewBox con la proporción real y el trazo usa
 * `vectorEffect` para mantener su grosor.
 *
 * Una sola serie y una sola escala. El título del bloque ya nombra el dato, así
 * que no lleva leyenda; el valor se lee al pasar por encima.
 */

export interface PuntoIngreso {
  label: string
  value: number
}

const W = 560
const H = 190
const PAD_X = 10
const PAD_TOP = 18
const PAD_BOTTOM = 26

export default function GraficoIngresosHero({ datos }: { datos: PuntoIngreso[] }) {
  const [activo, setActivo] = useState<number | null>(null)

  if (datos.length < 2) return null

  const valores = datos.map((d) => d.value)
  const max = Math.max(...valores)
  const min = Math.min(...valores, 0)
  // Un poco de aire arriba para que el pico no toque el borde de la tarjeta.
  const tope = max > min ? max + (max - min) * 0.18 : max || 1
  const rango = tope - min || 1

  const utilAlto = H - PAD_TOP - PAD_BOTTOM
  const paso = (W - PAD_X * 2) / (datos.length - 1)
  const x = (i: number) => PAD_X + i * paso
  const y = (v: number) => PAD_TOP + utilAlto * (1 - (v - min) / rango)

  // La forma la elige el dato, no el gusto: una serie diaria con cobros
  // puntuales es casi toda ceros, y una linea ahi dibuja una aguja sobre una
  // base plana. Con esa densidad, las barras leen el dato real.
  const ceros = valores.filter((v) => v === 0).length
  const comoBarras = ceros / valores.length > 0.35

  const linea = datos
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`)
    .join(' ')
  const base = PAD_TOP + utilAlto
  const area = `${linea} L ${x(datos.length - 1).toFixed(1)} ${base} L ${x(0).toFixed(1)} ${base} Z`

  const ultimo = datos.length - 1
  const anchoBarra = Math.max(3, Math.min(14, paso * 0.55))
  // Con muchos meses, etiquetar todos los apelmaza: se dejan los extremos.
  const etiquetaVisible = (i: number) =>
    datos.length <= 7 || i === 0 || i === ultimo || i % Math.ceil(datos.length / 6) === 0

  const puntoActivo = activo !== null ? datos[activo] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 190 }}
        role="img"
        aria-label={`Ingresos por periodo, de ${formatCurrency(valores[0])} a ${formatCurrency(valores[ultimo])}`}
      >
        <defs>
          <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(196,30,30,0.42)" />
            <stop offset="100%" stopColor="rgba(196,30,30,0)" />
          </linearGradient>
          <linearGradient id="hero-linea" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9E1A1A" />
            <stop offset="60%" stopColor="#C41E1E" />
            <stop offset="100%" stopColor="#F07A7C" />
          </linearGradient>
        </defs>

        {/* Rejilla recesiva: ubica sin competir con el trazo. */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + utilAlto * f}
            y2={PAD_TOP + utilAlto * f}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {comoBarras ? (
          datos.map((d, i) =>
            d.value > 0 ? (
              <rect
                key={`b-${d.label}`}
                x={x(i) - anchoBarra / 2}
                y={y(d.value)}
                width={anchoBarra}
                height={Math.max(2, base - y(d.value))}
                rx={anchoBarra / 2.6}
                fill={activo === null || activo === i ? '#C41E1E' : 'rgba(196,30,30,0.4)'}
              />
            ) : null,
          )
        ) : (
          <>
            <path d={area} fill="url(#hero-area)" />
            <path
              d={linea}
              fill="none"
              stroke="url(#hero-linea)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={x(ultimo)} cy={y(datos[ultimo].value)} r="7" fill="#C41E1E" opacity="0.22" />
            <circle
              cx={x(ultimo)}
              cy={y(datos[ultimo].value)}
              r="4"
              fill="#FFFFFF"
              stroke="#C41E1E"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {activo !== null && !comoBarras && (
          <>
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={PAD_TOP}
              y2={base}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={x(activo)} cy={y(datos[activo].value)} r="4.5" fill="#FFFFFF" />
          </>
        )}

        {/* Zonas de contacto: más anchas que el punto, para acertar con el dedo. */}
        {datos.map((d, i) => (
          <rect
            key={d.label}
            x={x(i) - paso / 2}
            y={0}
            width={paso}
            height={base}
            fill="transparent"
            onMouseEnter={() => setActivo(i)}
            onMouseLeave={() => setActivo(null)}
          />
        ))}

        {datos.map((d, i) =>
          etiquetaVisible(i) ? (
            <text
              key={`t-${d.label}`}
              x={x(i)}
              y={H - 7}
              textAnchor={i === 0 ? 'start' : i === ultimo ? 'end' : 'middle'}
              fontSize="10.5"
              fill={activo === i ? 'rgba(255,255,255,0.85)' : 'rgba(165,165,172,0.75)'}
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>

      {puntoActivo && activo !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-xl border border-white/[0.12] bg-phm-g2/95 px-3 py-1.5 shadow-premium"
          style={{
            // Sigue al punto, pero se frena cerca de los bordes para no salirse.
            left: `${Math.min(88, Math.max(12, (x(activo) / W) * 100))}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-phm-gray-soft">{puntoActivo.label}</p>
          <p className="tabular mt-0.5 text-[13.5px] font-bold text-white">{formatCurrency(puntoActivo.value)}</p>
        </div>
      )}
    </div>
  )
}
