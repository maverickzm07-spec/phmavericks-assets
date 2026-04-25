'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-50">Reportes Mensuales</h1>
        <p className="text-zinc-500 text-sm">Selecciona un plan para ver el reporte completo</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los clientes</option>
          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.month} onChange={(e) => handleFilter('month', e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los meses</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => handleFilter('year', e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No hay planes"
          description="Crea un plan mensual para generar reportes."
          actionLabel="Nuevo Plan"
          actionHref="/planes/nuevo"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const compliance = calculateCompliance(plan, plan.contents || [])
            return (
              <div key={plan.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-zinc-100">{plan.client?.name}</p>
                    <p className="text-sm text-zinc-500">{getMonthName(plan.month)} {plan.year}</p>
                  </div>
                  {planStatusBadge(plan.planStatus)}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  {paymentStatusBadge(plan.paymentStatus)}
                  <span className="text-sm text-zinc-400">{formatCurrency(plan.monthlyPrice)}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Reels: <span className="text-purple-400">{compliance.reelsDelivered}/{plan.reelsCount}</span></span>
                    <span>Carruseles: <span className="text-blue-400">{compliance.carouselsDelivered}/{plan.carouselsCount}</span></span>
                    <span>Flyers: <span className="text-orange-400">{compliance.flyersDelivered}/{plan.flyersCount}</span></span>
                  </div>
                  <ProgressBar value={compliance.compliancePercentage} size="sm" />
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Entregados: {compliance.totalDelivered}/{compliance.totalContracted}</span>
                    <span className="font-semibold text-zinc-300">{compliance.compliancePercentage}%</span>
                  </div>
                </div>

                <Link
                  href={`/reportes/${plan.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-white rounded-lg transition-all"
                  style={{ backgroundColor: '#8B0000' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ver Reporte Completo
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
