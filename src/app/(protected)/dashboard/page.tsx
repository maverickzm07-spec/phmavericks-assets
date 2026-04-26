'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardStats } from '@/types'
import { getMonthName, calculateCompliance, formatCurrency, formatNumber } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'
import { planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'

function MetricCard({ title, value, sub, icon, color }: {
  title: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-50">{value}</p>
        <p className="text-sm font-medium text-zinc-400 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setUserRole(d.role) }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error(`Dashboard fetch failed: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!data || !Array.isArray(data.recentPlans)) {
          setStats({
            activeClients: data?.activeClients ?? 0,
            pendingContents: data?.pendingContents ?? 0,
            completedContents: data?.completedContents ?? 0,
            completedPlans: data?.completedPlans ?? 0,
            delayedPlans: data?.delayedPlans ?? 0,
            avgCompliance: data?.avgCompliance ?? 0,
            recentPlans: Array.isArray(data?.recentPlans) ? data.recentPlans : [],
          })
        } else {
          setStats(data)
        }
      })
      .catch((error) => {
        console.error(error)
        setStats({
          activeClients: 0,
          pendingContents: 0,
          completedContents: 0,
          completedPlans: 0,
          delayedPlans: 0,
          avgCompliance: 0,
          recentPlans: [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando dashboard...
        </div>
      </div>
    )
  }

  if (!stats) return (
    <div className="text-zinc-400 text-center py-10">No se pudo cargar el dashboard. Intenta actualizar la página.</div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Buen día, Admin 👋</h1>
        <p className="text-zinc-500 text-sm mt-1">Resumen del estado actual del sistema PHMavericks.</p>
      </div>

      {/* Ingresos del mes - solo admin/super_admin */}
      {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (stats as any)?.ingresosMes !== undefined && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 font-medium">Ingresos cobrados este mes</p>
            <p className="text-3xl font-bold text-white mt-1">${((stats as any).ingresosMes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#8B0000' }}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Clientes Activos"
          value={stats.activeClients}
          sub="Con plan vigente"
          color="#8B0000"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <MetricCard
          title="Contenidos Pendientes"
          value={stats.pendingContents}
          sub="Por producir o publicar"
          color="#d97706"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Contenidos Entregados"
          value={stats.completedContents}
          sub="Publicados y completados"
          color="#16a34a"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Planes Completados"
          value={stats.completedPlans}
          color="#2563eb"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>}
        />
        <MetricCard
          title="Planes Atrasados"
          value={stats.delayedPlans}
          sub="Requieren atención"
          color="#dc2626"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <MetricCard
          title="Cumplimiento Promedio"
          value={`${stats.avgCompliance}%`}
          sub="Todos los planes"
          color="#7c3aed"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      {/* Recent Plans */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">Planes Recientes</h2>
          <Link href="/planes" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Período</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Pago</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3 min-w-[140px]">Cumplimiento</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {(stats.recentPlans ?? []).map((plan: any) => {
                const compliance = calculateCompliance(plan, plan.contents || [])
                return (
                  <tr key={plan.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{plan.client?.name}</p>
                        <p className="text-xs text-zinc-500">{plan.client?.business}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-300">
                      {getMonthName(plan.month)} {plan.year}
                    </td>
                    <td className="px-5 py-3">{planStatusBadge(plan.planStatus)}</td>
                    <td className="px-5 py-3">{paymentStatusBadge(plan.paymentStatus)}</td>
                    <td className="px-5 py-3">
                      <ProgressBar value={compliance.compliancePercentage} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-300">
                      {formatCurrency(plan.monthlyPrice)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {stats.recentPlans.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No hay planes creados todavía.{' '}
              <Link href="/planes/nuevo" className="underline hover:text-zinc-300">Crear uno</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
