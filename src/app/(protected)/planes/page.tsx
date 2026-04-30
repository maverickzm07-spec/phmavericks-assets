'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, ArrowUpRight } from 'lucide-react'
import { MonthlyPlan } from '@/types'
import { planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import PremiumCard from '@/components/ui/PremiumCard'
import { getMonthName, calculateCompliance, formatCurrency, MONTHS } from '@/lib/utils'

export default function PlanesPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ clientId: '', month: '', year: '', planStatus: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    fetch('/api/clientes')
      .then(async (r) => {
        const data = await r.json()
        return Array.isArray(data) ? data : []
      })
      .then(setClients)
      .catch((error) => {
        console.error('Error fetching clients:', error)
        setClients([])
      })
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

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetch(`/api/planes/${deleteId}`, { method: 'DELETE' })
      setPlans((prev) => prev.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const deletingPlan = plans.find((p) => p.id === deleteId)

  const selectCls = 'px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors'

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Gestión</span>
        </div>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Planes Mensuales</h1>
            <p className="text-phm-gray-soft text-sm mt-1">
              {plans.length} plan{plans.length !== 1 ? 'es' : ''} encontrado{plans.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/planes/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Plan
          </Link>
        </div>
      </header>

      <PremiumCard padding="sm">
        <div className="flex gap-3 flex-wrap">
          <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)} className={selectCls}>
            <option value="">Todos los clientes</option>
            {(Array.isArray(clients) ? clients : []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.month} onChange={(e) => handleFilter('month', e.target.value)} className={selectCls}>
            <option value="">Todos los meses</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={filters.year} onChange={(e) => handleFilter('year', e.target.value)} className={selectCls}>
            <option value="">Todos los años</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.planStatus} onChange={(e) => handleFilter('planStatus', e.target.value)} className={selectCls}>
            <option value="">Todos los estados</option>
            <option value="IN_PROGRESS">En Proceso</option>
            <option value="COMPLETED">Completado</option>
            <option value="DELAYED">Atrasado</option>
          </select>
        </div>
      </PremiumCard>

      {loading ? (
        <PremiumCard padding="none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[58px] skeleton-shimmer border-b border-phm-border-soft last:border-0" />
          ))}
        </PremiumCard>
      ) : plans.length === 0 ? (
        <PremiumCard padding="none">
          <EmptyState
            title="No hay planes mensuales"
            description="Crea el primer plan mensual para un cliente."
            actionLabel="Nuevo Plan"
            actionHref="/planes/nuevo"
          />
        </PremiumCard>
      ) : (
        <PremiumCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Cliente</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Período</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Contratado</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Estado</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Pago</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3 min-w-[140px]">Cumplimiento</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-phm-border-soft">
                {plans.map((plan) => {
                  const compliance = calculateCompliance(plan, plan.contents || [])
                  const total = plan.reelsCount + plan.carouselsCount + plan.flyersCount
                  return (
                    <tr key={plan.id} className="row-hover">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-white">{plan.client?.name}</p>
                        <p className="text-xs text-phm-gray-soft">{plan.client?.business}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-phm-gray">
                        {getMonthName(plan.month)} {plan.year}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className="text-purple-400">{plan.reelsCount}R</span>
                        {' · '}
                        <span className="text-blue-400">{plan.carouselsCount}C</span>
                        {' · '}
                        <span className="text-orange-400">{plan.flyersCount}F</span>
                        <span className="text-phm-gray-soft ml-1">({total})</span>
                      </td>
                      <td className="px-5 py-3.5">{planStatusBadge(plan.planStatus)}</td>
                      <td className="px-5 py-3.5">{paymentStatusBadge(plan.paymentStatus)}</td>
                      <td className="px-5 py-3.5">
                        <div className="w-32">
                          <ProgressBar value={compliance.compliancePercentage} size="sm" />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <Link href={`/reportes/${plan.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                            Reporte
                          </Link>
                          <Link href={`/planes/${plan.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                            Editar <ArrowUpRight className="w-3 h-3" />
                          </Link>
                          <button onClick={() => setDeleteId(plan.id)} className="inline-flex items-center text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded-md border border-red-900/40 hover:border-red-700/60 bg-red-950/20 hover:bg-red-950/40">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </PremiumCard>
      )}

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="¿Eliminar plan?"
        description={`Se eliminará el plan de "${deletingPlan?.client?.name}" (${deletingPlan ? getMonthName(deletingPlan.month) : ''} ${deletingPlan?.year || ''}) y todos sus contenidos.`}
      />
    </div>
  )
}
