'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive, ArrowUpRight, Download, Sparkles } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import { formatCurrency } from '@/lib/utils'
import { CIERRE_HISTORICO } from '@/lib/historico'
import { ESTADO_LABELS } from '@/lib/projectStatus'

interface Resumen {
  periodo: { desde: string; hasta: string }
  resumen: {
    ingresosCobrados: number
    ingresosNuevos: number
    cobrosCarteraHistorica: number
    gastosPagados: number
    resultadoOperativo: number
    cuentasPorCobrar: number
    cuentasPorPagar: number
    clientesConDeuda: number
  }
  gastosPorCategoria: { nombre: string; total: number }[]
  porProyecto: {
    id: string; nombre: string; cliente: string | null; estado: string
    contratado: number; cobrado: number; saldoPendiente: number | null
    gastos: number; resultadoCaja: number; margenSobreContratado: number | null
    esHistorico: boolean
  }[]
}

const mesActual = () => {
  const h = new Date()
  return {
    desde: new Date(h.getFullYear(), h.getMonth(), 1).toISOString().slice(0, 10),
    hasta: new Date(h.getFullYear(), h.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

export default function FinanzasPage() {
  const [data, setData] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [rango, setRango] = useState(mesActual())
  const [verHistorico, setVerHistorico] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch(`/api/finanzas/resumen?desde=${rango.desde}&hasta=${rango.hasta}`)
      if (!res.ok) { setError('No se pudo cargar el resumen financiero'); setData(null); return }
      setData(await res.json())
      setError('')
    } catch {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }, [rango])

  useEffect(() => { cargar() }, [cargar])

  const r = data?.resumen
  const filtroCls = 'px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-red-bright/40 transition-colors'

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-red-bright text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-acento-premium">Centro de control</span>
        </div>
        <h1 className="mt-1 text-3xl font-bold text-white tracking-tight">Finanzas</h1>
        <p className="text-phm-gray-soft text-sm mt-1">Resultado de la operación en el período seleccionado</p>
      </header>

      <PremiumCard padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })}
            className={filtroCls} aria-label="Desde" />
          <input type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })}
            className={filtroCls} aria-label="Hasta" />
          <button onClick={() => setRango(mesActual())}
            className="px-3 py-2 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-red-bright/40 hover:text-white rounded-lg transition-colors">
            Mes actual
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            <a href={`/api/finanzas/reporte?anio=${new Date(rango.desde).getFullYear()}&mes=${new Date(rango.desde).getMonth() + 1}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-phm-red-bright border border-phm-red-bright/30 hover:border-phm-red-bright/60 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Reporte contable
            </a>
            <Link href="/ingresos" className="px-3 py-2 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-red-bright/40 hover:text-white rounded-lg transition-colors">Ingresos</Link>
            <Link href="/gastos" className="px-3 py-2 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-red-bright/40 hover:text-white rounded-lg transition-colors">Gastos</Link>
            <Link href="/reportes" className="px-3 py-2 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-red-bright/40 hover:text-white rounded-lg transition-colors">Reportes</Link>
          </div>
        </div>
      </PremiumCard>

      {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 skeleton-shimmer rounded-xl" />)}
        </div>
      ) : r ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen del período">
            <PremiumCard padding="md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-phm-gray-soft">Ingresos cobrados</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-400 tabular-nums">{formatCurrency(r.ingresosCobrados)}</p>
              <p className="mt-1 text-xs text-phm-gray-soft">Dinero efectivamente recibido</p>
            </PremiumCard>
            <PremiumCard padding="md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-phm-gray-soft">Gastos pagados</p>
              <p className="mt-2 text-2xl font-semibold text-amber-400 tabular-nums">{formatCurrency(r.gastosPagados)}</p>
              <p className="mt-1 text-xs text-phm-gray-soft">Salida real de caja</p>
            </PremiumCard>
            <PremiumCard padding="md" className={r.resultadoOperativo >= 0 ? '' : 'border-red-900/60'}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-phm-gray-soft">Resultado operativo</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${r.resultadoOperativo >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatCurrency(r.resultadoOperativo)}
              </p>
              <p className="mt-1 text-xs text-phm-gray-soft">Cobrado menos pagado</p>
            </PremiumCard>
            <PremiumCard padding="md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-phm-gray-soft">Por cobrar / por pagar</p>
              <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{formatCurrency(r.cuentasPorCobrar)}</p>
              <p className="mt-1 text-xs text-phm-gray-soft">Por pagar: {formatCurrency(r.cuentasPorPagar)}</p>
            </PremiumCard>
          </section>

          {r.cobrosCarteraHistorica > 0 && (
            <PremiumCard padding="md">
              <div className="flex items-start gap-3">
                <Archive className="w-4 h-4 text-phm-red-bright flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(r.cobrosCarteraHistorica)} provienen de cartera histórica
                  </p>
                  <p className="mt-1 text-xs text-phm-gray-soft">
                    Son cobros de deudas anteriores al cierre, no ventas nuevas. Entran al flujo de caja del
                    período, pero no cuentan como contratación nueva: esa fue {formatCurrency(r.ingresosNuevos)}.
                  </p>
                </div>
              </div>
            </PremiumCard>
          )}

          {data.gastosPorCategoria.length > 0 && (
            <PremiumCard padding="md">
              <h2 className="text-sm font-semibold text-phm-gray mb-3">Gastos por categoría</h2>
              <ul className="space-y-2">
                {data.gastosPorCategoria.map((c) => (
                  <li key={c.nombre} className="flex items-center justify-between text-sm">
                    <span className="text-phm-gray">{c.nombre}</span>
                    <span className="font-semibold text-white tabular-nums">{formatCurrency(c.total)}</span>
                  </li>
                ))}
              </ul>
            </PremiumCard>
          )}

          <PremiumCard padding="none">
            <div className="px-5 py-4 border-b border-phm-border-soft">
              <h2 className="text-sm font-semibold text-white">Resultado por proyecto</h2>
              <p className="mt-0.5 text-xs text-phm-gray-soft">
                El resultado de caja es lo cobrado menos los gastos pagados. El margen supone cobrar todo lo contratado.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 820 }}>
                <thead>
                  <tr className="border-b border-phm-border-soft">
                    {['Proyecto', 'Estado', 'Contratado', 'Cobrado', 'Saldo', 'Gastos', 'Caja', 'Margen'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-phm-gray-soft">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-phm-border-soft">
                  {data.porProyecto.map((p) => (
                    <tr key={p.id} className="row-hover">
                      <td className="px-4 py-3">
                        <Link href={`/proyectos/${p.id}`} className="text-white hover:text-phm-red-bright transition-colors">
                          {p.nombre}
                        </Link>
                        {p.cliente && <p className="text-xs text-phm-gray-soft">{p.cliente}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-phm-gray">{ESTADO_LABELS[p.estado] ?? p.estado}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-phm-gray">{p.contratado ? formatCurrency(p.contratado) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-400">{formatCurrency(p.cobrado)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-400">{p.saldoPendiente ? formatCurrency(p.saldoPendiente) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-phm-gray">{p.gastos ? formatCurrency(p.gastos) : '—'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${p.resultadoCaja >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {formatCurrency(p.resultadoCaja)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-phm-gray-soft">
                        {p.margenSobreContratado != null ? formatCurrency(p.margenSobreContratado) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PremiumCard>
        </>
      ) : null}

      {/* Histórico financiero: inmutable, separado de la operación nueva */}
      <PremiumCard padding="none">
        <button onClick={() => setVerHistorico((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2.5">
            <Archive className="w-4 h-4 text-phm-red-bright" />
            <div>
              <h2 className="text-sm font-semibold text-white">Histórico financiero</h2>
              <p className="mt-0.5 text-xs text-phm-gray-soft">
                Cierre al {CIERRE_HISTORICO.fechaCorte.toLocaleDateString('es-EC')} · etapa anterior, no se mezcla con la operación actual
              </p>
            </div>
          </div>
          <ArrowUpRight className={`w-4 h-4 text-phm-gray-soft transition-transform ${verHistorico ? 'rotate-90' : ''}`} />
        </button>

        {verHistorico && (
          <div className="px-5 pb-5 space-y-5 border-t border-phm-border-soft pt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: 'Total contratado', v: formatCurrency(CIERRE_HISTORICO.totalContratado), t: 'text-white' },
                { l: 'Efectivamente cobrado', v: formatCurrency(CIERRE_HISTORICO.totalCobrado), t: 'text-emerald-400' },
                { l: 'Pendiente de cobro', v: formatCurrency(CIERRE_HISTORICO.cuentasPorCobrar), t: 'text-amber-400' },
                { l: 'Gastos documentados', v: 'Sin registros', t: 'text-phm-gray-soft' },
              ].map((x) => (
                <div key={x.l} className="px-4 py-3 bg-phm-surface border border-phm-border-soft rounded-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-phm-gray-soft">{x.l}</p>
                  <p className={`mt-1.5 text-lg font-semibold tabular-nums ${x.t}`}>{x.v}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-phm-gray-soft mb-2">Cartera histórica por cobrar</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 520 }}>
                  <thead>
                    <tr className="border-b border-phm-border-soft">
                      {['Cliente', 'Proyecto', 'Contratado', 'Cobrado', 'Saldo al cierre'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-phm-gray-soft">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-phm-border-soft">
                    {CIERRE_HISTORICO.carteraAlCorte.map((c) => (
                      <tr key={`${c.cliente}-${c.proyecto}`}>
                        <td className="px-3 py-2 text-white">{c.cliente}</td>
                        <td className="px-3 py-2 text-phm-gray">{c.proyecto}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-phm-gray">{formatCurrency(c.contratado)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-phm-gray">{formatCurrency(c.cobrado)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-400">{formatCurrency(c.saldoAlCorte)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-phm-gray-soft mb-2">Ingresos por mes</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CIERRE_HISTORICO.ingresosPorMes.map((m) => (
                  <li key={m.mes} className="flex items-center justify-between px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm">
                    <span className="text-phm-gray">{m.etiqueta}</span>
                    <span className="font-semibold text-white tabular-nums">{formatCurrency(m.cobrado)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-4 py-3 bg-amber-950/30 border border-amber-900/50 rounded-lg">
              <p className="text-xs font-semibold text-amber-200 mb-1.5">Lo que este cierre no puede afirmar</p>
              <ul className="space-y-1">
                {CIERRE_HISTORICO.limitaciones.map((l) => (
                  <li key={l} className="text-xs text-amber-100/80">· {l}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-phm-gray-soft">
              Respaldo verificado: <code className="text-phm-gray">{CIERRE_HISTORICO.respaldo.archivo}</code> · {CIERRE_HISTORICO.respaldo.verificado}
            </p>
          </div>
        )}
      </PremiumCard>
    </div>
  )
}
