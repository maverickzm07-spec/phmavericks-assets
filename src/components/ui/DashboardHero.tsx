'use client'

import { ArrowUpRight, DollarSign, TrendingUp } from 'lucide-react'
import Sparkline from './Sparkline'

interface DashboardHeroProps {
  amount: number
  label?: string
  changePct?: number // ej: 12.5 -> "↑ 12.5% vs mes pasado"
  data?: number[]
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
  label = 'Ingresos cobrados este mes',
  changePct,
  data,
  currency = 'USD',
}: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-phm-border-soft shadow-premium">
      {/* Fondo cinematográfico */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-hero"
      />
      {/* Patrón de cuadrícula sutil */}
      <div aria-hidden className="absolute inset-0 bg-grid-pattern opacity-50 mix-blend-overlay" />
      {/* Glow rojo izquierda */}
      <div
        aria-hidden
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(229, 9, 20, 0.30), transparent 70%)' }}
      />
      {/* Glow dorado derecha */}
      <div
        aria-hidden
        className="absolute -bottom-24 -right-12 w-80 h-80 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(201, 168, 76, 0.20), transparent 70%)' }}
      />
      {/* Línea dorada superior */}
      <div className="absolute top-0 left-0 right-0 h-px gold-line" />

      <div className="relative grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 p-6 md:p-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#8B0000] to-[#B00000] ring-1 ring-[#C9A84C]/40 shadow-glow-red">
              <DollarSign className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-phm-gray uppercase tracking-wider">
              {label}
            </p>
          </div>
          <p className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-none">
            {formatMoney(amount, currency)}
          </p>
          {typeof changePct === 'number' && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                {changePct >= 0 ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
              </span>
              <span className="text-emerald-400/70">vs mes pasado</span>
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

        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-transparent via-phm-gold/10 to-transparent rounded-2xl blur-xl pointer-events-none" />
          <Sparkline data={data} height={140} />
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-phm-gray-soft">
            <span>Inicio del mes</span>
            <span>Hoy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
