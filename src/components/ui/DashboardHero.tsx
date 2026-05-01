'use client'

import { ArrowUpRight, DollarSign, TrendingUp, TrendingDown, ChevronDown, CalendarRange, Loader2 } from 'lucide-react'
import Sparkline from './Sparkline'
import { useState, useRef, useEffect } from 'react'

const RANGES = [
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'last_28_days', label: 'Últimos 28 días' },
  { value: 'last_90_days', label: 'Últimos 90 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'previous_month', label: 'Mes anterior' },
  { value: 'this_year', label: 'Este año' },
  { value: 'all_time', label: 'Total histórico' },
  { value: 'custom', label: 'Personalizado' },
]

export interface DashboardHeroProps {
  amount: number
  changePct?: number | null
  series?: { label: string; value: number }[]
  rangeStart?: string
  rangeEnd?: string
  selectedRange?: string
  onRangeChange?: (range: string, opts?: { startDate?: string; endDate?: string }) => void
  loading?: boolean
  currency?: string
}

function formatMoney(n: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

export default function DashboardHero({
  amount,
  changePct,
  series = [],
  rangeStart,
  rangeEnd,
  selectedRange = 'this_month',
  onRangeChange,
  loading = false,
  currency = 'USD',
}: DashboardHeroProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(selectedRange === 'custom')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const activeLabel = RANGES.find(r => r.value === selectedRange)?.label ?? 'Este mes'
  const chartValues = series.length > 0 ? series.map(s => s.value) : undefined
  const hasData = series.some(s => s.value > 0)
  const firstLabel = series.length > 0 ? series[0].label : (rangeStart ?? 'Inicio')
  const lastLabel = series.length > 0 ? series[series.length - 1].label : (rangeEnd ?? 'Hoy')

  const handleSelect = (value: string) => {
    if (value === 'custom') {
      setShowCustom(true)
      onRangeChange?.('custom')
      // keep dropdown open to show date inputs
    } else {
      setShowCustom(false)
      setDropdownOpen(false)
      onRangeChange?.(value)
    }
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return
    setDropdownOpen(false)
    onRangeChange?.('custom', { startDate: customStart, endDate: customEnd })
  }

  return (
    <div className="relative rounded-2xl border border-phm-border-soft shadow-premium">
      {/* Background decorations — clipped within their own wrapper */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50 mix-blend-overlay" />
        <div
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(229, 9, 20, 0.30), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -right-12 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(201, 168, 76, 0.20), transparent 70%)' }}
        />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px gold-line" />

      <div className="relative grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 p-6 md:p-8 items-center">
        {/* Left column */}
        <div>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#8B0000] to-[#B00000] ring-1 ring-[#C9A84C]/40 shadow-glow-red flex-shrink-0">
              <DollarSign className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-phm-gray uppercase tracking-wider mb-1.5">
                Ingresos cobrados
              </p>
              {/* Range selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-phm-gold/40 hover:bg-white/10 transition-all text-xs font-semibold text-white"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-phm-gray-soft" />}
                  <span>{activeLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-phm-gray-soft transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div className="absolute top-full mt-1.5 left-0 w-52 bg-[#111113] border border-white/10 rounded-xl shadow-2xl z-50">
                    <ul className="py-1.5">
                      {RANGES.map(r => {
                        const isActive = selectedRange === r.value
                        return (
                          <li key={r.value}>
                            <button
                              onClick={() => handleSelect(r.value)}
                              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${
                                isActive ? 'text-phm-gold bg-white/5' : 'text-white hover:bg-white/5'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-phm-gold' : 'bg-transparent'}`} />
                              {r.label}
                            </button>
                          </li>
                        )
                      })}
                    </ul>

                    {/* Custom date inputs */}
                    {showCustom && (
                      <div className="border-t border-white/10 p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-phm-gray-soft uppercase tracking-wide block mb-1">Desde</label>
                            <input
                              type="date"
                              value={customStart}
                              onChange={e => setCustomStart(e.target.value)}
                              className="w-full bg-phm-surface border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-phm-gold/40 [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-phm-gray-soft uppercase tracking-wide block mb-1">Hasta</label>
                            <input
                              type="date"
                              value={customEnd}
                              onChange={e => setCustomEnd(e.target.value)}
                              className="w-full bg-phm-surface border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-phm-gold/40 [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleApplyCustom}
                          disabled={!customStart || !customEnd}
                          className="w-full py-1.5 text-xs font-semibold bg-phm-red hover:bg-phm-red-hover text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date range label */}
          {rangeStart && rangeEnd && (
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarRange className="w-3.5 h-3.5 text-phm-gold/60 flex-shrink-0" />
              <span className="text-[11px] text-phm-gray-soft">
                {rangeStart} — {rangeEnd}
              </span>
            </div>
          )}

          {/* Main amount */}
          <p className={`text-5xl md:text-6xl font-bold tracking-tight text-white leading-none transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
            {formatMoney(amount, currency)}
          </p>

          {/* Change badge */}
          {typeof changePct === 'number' && (
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              changePct >= 0
                ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300'
                : 'border-red-700/50 bg-red-950/40 text-red-300'
            }`}>
              {changePct >= 0
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />
              }
              <span className="tabular-nums">
                {changePct >= 0 ? '↑' : '↓'} {Math.abs(changePct)}%
              </span>
              <span className={changePct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}>
                vs período anterior
              </span>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <a
              href="/ingresos"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-phm-gold hover:text-phm-gold-bright transition-colors"
            >
              Ver detalle de ingresos
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Right column — chart */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-transparent via-phm-gold/10 to-transparent rounded-2xl blur-xl pointer-events-none" />
          {!hasData && series.length > 0 ? (
            <div className="flex items-center justify-center h-[140px]">
              <p className="text-sm text-phm-gray-soft">Sin ingresos en este rango</p>
            </div>
          ) : (
            <div className={`transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-100'}`}>
              <Sparkline data={chartValues} height={140} />
            </div>
          )}
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-phm-gray-soft">
            <span>{firstLabel}</span>
            <span>{lastLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
