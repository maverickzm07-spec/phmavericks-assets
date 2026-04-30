'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowUpRight, FileBarChart2 } from 'lucide-react'
import { planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import PremiumCard from '@/components/ui/PremiumCard'
import { getMonthName, calculateCompliance, formatCurrency, MONTHS } from '@/lib/utils'

export default function ReportesPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ clientId: '', month: '', year: '' })

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    setLoading(true)
    fetch(`/api/planes?${params}`)
      .then((r) => r.json())
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const selectCls = 'px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors'

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Análisis</span>
        </div>
        <div className="mt-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Reportes Mensuales</h1>
          <p className="text-phm-gray-soft text-sm mt-1">Selecciona un plan para ver el reporte completo</p>
        </div>
      </header>

      <PremiumCard padding="sm">
        <div className="flex gap-3 flex-wrap">
          <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)} className={selectCls}>
            <option value="">Todos los clientes</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.month} onChange={(e) => handleFilter('month', e.target.value)} className={selectCls}>
            <option value="">Todos los meses</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={filters.year} onChange={(e) => handleFilter('year', e.target.value)} className={selectCls}>
            <option value="">Todos los años</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </PremiumCard>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <PremiumCard padding="none">
          <EmptyState
            title="No hay planes"
            description="Crea un plan mensual para generar reportes."
            actionLabel="Nuevo Plan"
            actionHref="/planes/nuevo"
          />
        </PremiumCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const compliance = calculateCompliance(plan, plan.contents || [])
            return (
              <PremiumCard key={plan.id} hover padding="md">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{plan.client?.name}</p>
                    <p className="text-sm text-phm-gray-soft">{getMonthName(plan.month)} {plan.year}</p>
                  </div>
                  {planStatusBadge(plan.planStatus)}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  {paymentStatusBadge(plan.paymentStatus)}
                  <span className="text-sm text-phm-gray font-semibold">{formatCurrency(plan.monthlyPrice)}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-phm-gray-soft">
                    <span>Reels: <span className="text-purple-400">{compliance.reelsDelivered}/{plan.reelsCount}</span></span>
                    <span>Carr.: <span className="text-blue-400">{compliance.carouselsDelivered}/{plan.carouselsCount}</span></span>
                    <span>Flyers: <span className="text-orange-400">{compliance.flyersDelivered}/{plan.flyersCount}</span></span>
                  </div>
                  <ProgressBar value={compliance.compliancePercentage} size="sm" />
                  <div className="flex justify-between text-xs">
                    <span className="text-phm-gray-soft">Entregados: {compliance.totalDelivered}/{compliance.totalContracted}</span>
                    <span className="font-semibold text-white">{compliance.compliancePercentage}%</span>
                  </div>
                </div>

                <Link
                  href={`/reportes/${plan.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors"
                >
                  <FileBarChart2 className="w-4 h-4" />
                  Ver Reporte Completo
                </Link>
              </PremiumCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
