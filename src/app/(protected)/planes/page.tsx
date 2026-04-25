'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MonthlyPlan } from '@/types'
import { planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Planes Mensuales</h1>
          <p className="text-zinc-500 text-sm">{plans.length} plan{plans.length !== 1 ? 'es' : ''} encontrado{plans.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/planes/nuevo" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#8B0000' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Plan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los clientes</option>
          {(Array.isArray(clients) ? clients : []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        <select value={filters.planStatus} onChange={(e) => handleFilter('planStatus', e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los estados</option>
          <option value="IN_PROGRESS">En Proceso</option>
          <option value="COMPLETED">Completado</option>
          <option value="DELAYED">Atrasado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : plans.length === 0 ? (
          <EmptyState
            title="No hay planes mensuales"
            description="Crea el primer plan mensual para un cliente."
            actionLabel="Nuevo Plan"
            actionHref="/planes/nuevo"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Período</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Contratado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Pago</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3 min-w-[140px]">Cumplimiento</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {plans.map((plan) => {
                  const compliance = calculateCompliance(plan, plan.contents || [])
                  const total = plan.reelsCount + plan.carouselsCount + plan.flyersCount
                  return (
                    <tr key={plan.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-zinc-200">{plan.client?.name}</p>
                        <p className="text-xs text-zinc-500">{plan.client?.business}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-zinc-300">
                        {getMonthName(plan.month)} {plan.year}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-zinc-400">
                        <span className="text-purple-400">{plan.reelsCount}R</span>
                        {' · '}
                        <span className="text-blue-400">{plan.carouselsCount}C</span>
                        {' · '}
                        <span className="text-orange-400">{plan.flyersCount}F</span>
                        <span className="text-zinc-600 ml-1">({total} total)</span>
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
                          <Link href={`/reportes/${plan.id}`}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all">
                            Reporte
                          </Link>
                          <Link href={`/planes/${plan.id}`}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all">
                            Editar
                          </Link>
                          <button onClick={() => setDeleteId(plan.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-md transition-all">
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
        )}
      </div>

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
