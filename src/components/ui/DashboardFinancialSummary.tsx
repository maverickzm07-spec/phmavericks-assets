'use client'

import Link from 'next/link'
import { ArrowUpRight, CircleDollarSign, FolderKanban, Receipt, TrendingUp, WalletCards } from 'lucide-react'
import Sparkline from './Sparkline'
import PremiumCard from './PremiumCard'

interface DashboardFinancialSummaryProps {
  income: number | null
  incomeChange: number | null
  incomeSeries: number[]
  activeProjects: number | null
  receivable: number | null
  /** Gastos pagados del mes en curso. */
  expenses: number | null
  /** Cobrado menos pagado en el mes. */
  operatingResult: number | null
  showFinancials: boolean
  loading?: boolean
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  muted = false,
}: {
  label: string
  value: string
  detail: string
  icon: typeof CircleDollarSign
  muted?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-white/[0.07] pb-4 last:border-0 last:pb-0 md:border-b-0 md:border-r md:pb-0 md:pr-6 md:last:border-0 md:last:pr-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-phm-gold ring-1 ring-white/[0.08]">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-phm-gray-soft">{label}</p>
        <p className={`mt-1 text-xl font-semibold tracking-tight ${muted ? 'text-phm-gray-soft' : 'text-white'}`}>{value}</p>
        <p className="mt-0.5 truncate text-xs text-phm-gray-soft">{detail}</p>
      </div>
    </div>
  )
}

export default function DashboardFinancialSummary({
  income,
  incomeChange,
  incomeSeries,
  activeProjects,
  receivable,
  expenses,
  operatingResult,
  showFinancials,
  loading = false,
}: DashboardFinancialSummaryProps) {
  const dinero = (v: number | null) =>
    v === null ? '—' : `$${v.toLocaleString('es-EC', { maximumFractionDigits: 0 })}`
  return (
    <PremiumCard padding="md" className="overflow-visible">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {showFinancials ? (
            <SummaryMetric
              label="Ingresos cobrados"
              value={loading || income === null ? '—' : `$${income.toLocaleString('es-EC', { maximumFractionDigits: 0 })}`}
              detail={incomeChange === null ? 'Este mes' : `${incomeChange >= 0 ? '+' : ''}${incomeChange}% vs mes anterior`}
              icon={CircleDollarSign}
            />
          ) : (
            <SummaryMetric label="Ingresos cobrados" value="—" detail="Solo visible para administración" icon={CircleDollarSign} muted />
          )}
          {showFinancials ? (
            <SummaryMetric
              label="Por cobrar"
              value={receivable === null ? '—' : `$${receivable.toLocaleString('es-EC', { maximumFractionDigits: 0 })}`}
              detail={receivable === null ? 'Revisar en Ingresos' : receivable > 0 ? 'Saldos de proyectos y planes' : 'Sin saldos pendientes'}
              icon={WalletCards}
              muted={receivable === 0}
            />
          ) : (
            <SummaryMetric label="Por cobrar" value="—" detail="Solo visible para administración" icon={WalletCards} muted />
          )}
          {showFinancials ? (
            <SummaryMetric
              label="Gastos pagados"
              value={loading ? '—' : dinero(expenses)}
              detail="Salida real de caja"
              icon={Receipt}
            />
          ) : (
            <SummaryMetric label="Gastos pagados" value="—" detail="Solo visible para administración" icon={Receipt} muted />
          )}
          {showFinancials ? (
            <SummaryMetric
              label="Resultado operativo"
              value={loading ? '—' : dinero(operatingResult)}
              detail="Cobrado menos pagado"
              icon={TrendingUp}
            />
          ) : (
            <SummaryMetric
              label="Proyectos activos"
              value={activeProjects === null ? '—' : String(activeProjects)}
              detail="Pendientes de cierre"
              icon={FolderKanban}
            />
          )}
        </div>
        {incomeSeries.length > 1 && showFinancials && (
          <div className="hidden w-52 flex-shrink-0 lg:block">
            <Sparkline data={incomeSeries} height={52} showDots={false} />
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3">
        <span className="text-xs text-phm-gray-soft">Lectura rápida de la operación</span>
        <Link href={showFinancials ? '/ingresos' : '/proyectos'} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gold transition-colors hover:text-phm-gold-bright">
          Ver detalle <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </PremiumCard>
  )
}
