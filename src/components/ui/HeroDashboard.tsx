'use client'

import Link from 'next/link'
import { ArrowUpRight, Plus, Receipt, TrendingUp, WalletCards } from 'lucide-react'
import GraficoIngresosHero, { type PuntoIngreso } from './GraficoIngresosHero'
import { formatCurrency } from '@/lib/utils'

/**
 * Bloque principal del dashboard.
 *
 * Fusiona lo que funcionaba de la versión anterior —una cifra protagonista y
 * la gráfica integrada con glow— con la información que aporta la actual: las
 * otras tres métricas del mes, que bajan al pie como contexto.
 *
 * La jerarquía es deliberada: el dinero cobrado del mes manda, y por eso va a
 * 56 px mientras el resto queda a 20. Cuando todo pesa igual, nada destaca.
 */

const RANGOS = [
  { value: 'this_month', label: 'Este mes' },
  { value: 'previous_month', label: 'Mes anterior' },
  { value: 'this_year', label: 'Este año' },
  { value: 'all_time', label: 'Histórico' },
]

interface Props {
  saludo: string
  resumen: string
  cobrado: number | null
  cambioPct: number | null
  serie: PuntoIngreso[]
  /** Evolucion mes a mes, para cuando el rango elegido no da tendencia. */
  serieMensual: PuntoIngreso[]
  porCobrar: number | null
  gastos: number | null
  resultado: number | null
  rango: string
  onRangoChange: (r: string) => void
  verFinanzas: boolean
  cargando?: boolean
}

function MetricaPie({
  etiqueta,
  valor,
  icono: Icono,
  tono,
}: {
  etiqueta: string
  valor: string
  icono: typeof WalletCards
  tono: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ${tono}`}>
        <Icono className="h-[15px] w-[15px]" strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[9.5px] font-bold uppercase tracking-[0.14em] text-phm-gray-soft">{etiqueta}</p>
        <p className="tabular mt-0.5 truncate text-[17px] font-bold leading-tight text-white">{valor}</p>
      </div>
    </div>
  )
}

export default function HeroDashboard({
  saludo,
  resumen,
  cobrado,
  cambioPct,
  serie,
  serieMensual,
  porCobrar,
  gastos,
  resultado,
  rango,
  onRangoChange,
  verFinanzas,
  cargando = false,
}: Props) {
  const dinero = (v: number | null) => (v === null ? '—' : formatCurrency(v))
  const sube = (cambioPct ?? 0) >= 0

  // Un rango con uno o dos cobros sueltos no dibuja ninguna tendencia: en ese
  // caso se enseña la evolucion mes a mes, rotulada, en vez de un panel vacio.
  const conValor = serie.filter((p) => p.value > 0).length
  const usaMensual = conValor < 3 && serieMensual.length > 1
  const datosGrafica = usaMensual ? serieMensual : serie
  const rotuloGrafica = usaMensual
    ? 'Evolución mes a mes'
    : `Cobrado · ${RANGOS.find((r) => r.value === rango)?.label.toLowerCase() ?? 'este mes'}`

  return (
    <section
      className="relative overflow-hidden rounded-hero border border-white/[0.08] shadow-premium"
      style={{
        background:
          'radial-gradient(130% 110% at 100% 0%, rgba(139,0,0,.58) 0%, rgba(102,0,0,.2) 42%, transparent 70%),' +
          'linear-gradient(160deg, #1A1A1D 0%, #121214 55%, #0D0D0F 100%)',
      }}
    >
      {/* Brillo superior: marca el borde de la tarjeta sin dibujar una línea dura. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.07), transparent 34%)' }}
      />

      <div className="relative px-5 pt-6 md:px-8 md:pt-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Columna del dato protagonista */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-phm-gray">{saludo}</p>
              <div className="flex items-center gap-2 lg:hidden">
                <select
                  value={rango}
                  onChange={(e) => onRangoChange(e.target.value)}
                  aria-label="Periodo"
                  className="h-9 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 text-xs font-semibold text-phm-gray outline-none"
                >
                  {RANGOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {verFinanzas ? (
              <>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-phm-gray-soft">
                  Cobrado · {RANGOS.find((r) => r.value === rango)?.label ?? 'Este mes'}
                </p>
                <p
                  className={`tabular mt-1.5 text-[44px] font-extrabold leading-none tracking-[-0.035em] text-white transition-opacity md:text-[56px] ${
                    cargando ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  {dinero(cobrado)}
                </p>
                {cambioPct !== null && (
                  <span
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
                      sube
                        ? 'border-phm-ok/30 bg-phm-ok/12 text-phm-ok'
                        : 'border-phm-danger/30 bg-phm-danger/12 text-phm-danger'
                    }`}
                  >
                    {sube ? '▲' : '▼'} {Math.abs(cambioPct)}% <span className="font-medium opacity-80">vs mes anterior</span>
                  </span>
                )}
              </>
            ) : (
              <h1 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-tight text-white md:text-[42px]">
                Tu producción,<br className="md:hidden" /> bajo control
              </h1>
            )}

            <p className="mt-3.5 text-sm leading-relaxed text-phm-gray">{resumen}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link href="/proyectos/nuevo" className="btn-primario">
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Nuevo proyecto
              </Link>
              <select
                value={rango}
                onChange={(e) => onRangoChange(e.target.value)}
                aria-label="Periodo"
                className="hidden h-11 rounded-[14px] border border-white/[0.09] bg-white/[0.05] px-3.5 text-xs font-semibold text-phm-gray outline-none transition-colors focus:border-phm-red-bright/60 lg:block"
              >
                {RANGOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Gráfica: protagonista, no adorno. El halo la separa del fondo. */}
          {verFinanzas && datosGrafica.length > 1 && (
            <div className="relative w-full flex-none lg:w-[48%] lg:max-w-[560px]">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 rounded-[28px] blur-2xl"
                style={{ background: 'radial-gradient(62% 72% at 50% 62%, rgba(196,30,30,.2), transparent 72%)' }}
              />
              <div className="relative rounded-[20px] border border-white/[0.06] bg-black/20 px-3 pb-1 pt-3">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-phm-gray-soft">
                  {rotuloGrafica}
                </p>
                <GraficoIngresosHero datos={datosGrafica} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pie: las otras tres cifras del mes, como contexto del dato principal. */}
      {verFinanzas && (
        <div className="relative mt-6 grid grid-cols-1 gap-4 border-t border-white/[0.07] px-5 py-4 sm:grid-cols-3 md:px-8">
          <MetricaPie
            etiqueta="Por cobrar"
            valor={dinero(porCobrar)}
            icono={WalletCards}
            tono="bg-phm-red-bright/16 text-phm-red-bright"
          />
          <MetricaPie
            etiqueta="Gastos pagados"
            valor={dinero(gastos)}
            icono={Receipt}
            tono="bg-phm-warn/14 text-phm-warn"
          />
          <div className="flex items-center justify-between gap-3">
            <MetricaPie
              etiqueta="Resultado operativo"
              valor={dinero(resultado)}
              icono={TrendingUp}
              tono={resultado !== null && resultado < 0 ? 'bg-phm-danger/14 text-phm-danger' : 'bg-phm-ok/14 text-phm-ok'}
            />
            <Link
              href="/finanzas"
              className="hidden flex-none items-center gap-1 text-[11.5px] font-semibold text-phm-red-bright transition-colors hover:text-red-400 sm:inline-flex"
            >
              Finanzas <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
