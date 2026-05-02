'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Clock,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  Info,
} from 'lucide-react'
import { DashboardStats } from '@/types'
import { getMonthName, calculateCompliance, formatCurrency } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'
import { planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import PremiumCard from '@/components/ui/PremiumCard'
import KPICard from '@/components/ui/KPICard'
import DashboardHero from '@/components/ui/DashboardHero'
import ChartCard from '@/components/ui/ChartCard'
import Donut from '@/components/ui/Donut'

interface IncomeData {
  total: number
  previousTotal: number
  percentChange: number | null
  series: { label: string; value: number }[]
  label: string
  rangeStart: string
  rangeEnd: string
}

interface Alert {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
  href: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')

  const [incomeRange, setIncomeRange] = useState('this_month')
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null)
  const [loadingIncome, setLoadingIncome] = useState(false)

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  const fetchIncome = useCallback(async (range: string, opts?: { startDate?: string; endDate?: string }) => {
    setLoadingIncome(true)
    try {
      const params = new URLSearchParams({ range })
      if (opts?.startDate) params.set('startDate', opts.startDate)
      if (opts?.endDate) params.set('endDate', opts.endDate)
      const res = await fetch(`/api/dashboard/income?${params}`)
      if (res.ok) setIncomeData(await res.json())
    } catch { /* silent */ }
    finally { setLoadingIncome(false) }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) { setUserRole(d.role); setUserName(d.name || '') }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!userRole) return
    if (['SUPER_ADMIN', 'ADMIN'].includes(userRole)) fetchIncome(incomeRange)
    // Fetch alerts for all roles
    setLoadingAlerts(true)
    fetch('/api/dashboard/alerts')
      .then((r) => r.ok ? r.json() : [])
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoadingAlerts(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole])

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error('Dashboard fetch failed: ' + r.status)
        return r.json()
      })
      .then((data) => {
        setStats({
          activeClients: data?.activeClients ?? 0,
          pendingContents: data?.pendingContents ?? 0,
          completedContents: data?.completedContents ?? 0,
          completedPlans: data?.completedPlans ?? 0,
          delayedPlans: data?.delayedPlans ?? 0,
          avgCompliance: data?.avgCompliance ?? 0,
          recentPlans: Array.isArray(data?.recentPlans) ? data.recentPlans : [],
        })
      })
      .catch(() => {
        setStats({
          activeClients: 0, pendingContents: 0, completedContents: 0,
          completedPlans: 0, delayedPlans: 0, avgCompliance: 0, recentPlans: [],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const showFinancials = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  const planStatusDonut = useMemo(() => {
    if (!stats) return []
    const inProgress = (stats.recentPlans ?? []).filter((p: any) => p.planStatus === 'IN_PROGRESS').length
    return [
      { label: 'En Proceso', value: inProgress, color: '#C9A84C' },
      { label: 'Completados', value: stats.completedPlans, color: '#22C55E' },
      { label: 'Atrasados', value: stats.delayedPlans, color: '#E50914' },
    ]
  }, [stats])

  const paymentDonut = useMemo(() => {
    if (!stats) return []
    const counts = { paid: 0, partial: 0, pending: 0 }
    ;(stats.recentPlans ?? []).forEach((p: any) => {
      if (p.paymentStatus === 'PAID') counts.paid++
      else if (p.paymentStatus === 'PARTIAL') counts.partial++
      else if (p.paymentStatus === 'PENDING') counts.pending++
    })
    return [
      { label: 'Pagados', value: counts.paid, color: '#22C55E' },
      { label: 'Parciales', value: counts.partial, color: '#F59E0B' },
      { label: 'Pendientes', value: counts.pending, color: '#E50914' },
    ]
  }, [stats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 skeleton-shimmer rounded-lg" />
        <div className="h-40 w-full skeleton-shimmer rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
        <div className="h-72 w-full skeleton-shimmer rounded-2xl" />
      </div>
    )
  }

  if (!stats) {
    return (
      <PremiumCard padding="lg" className="text-center">
        <p className="text-phm-gray">No se pudo cargar el dashboard. Intenta actualizar la página.</p>
      </PremiumCard>
    )
  }

  const greeting = userName ? '¡Bienvenido, ' + userName.split(' ')[0] + '!' : '¡Bienvenido!'

  const alertIcon = (type: Alert['type']) => {
    if (type === 'danger') return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
    return <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
  }

  const alertBorder = (type: Alert['type']) => {
    if (type === 'danger') return 'border-l-2 border-red-700 bg-red-950/20'
    if (type === 'warning') return 'border-l-2 border-amber-700 bg-amber-950/10'
    return 'border-l-2 border-blue-700 bg-blue-950/10'
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">{greeting}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-1 tracking-tight">Dashboard</h1>
        <p className="text-phm-gray-soft text-sm mt-1">
          Resumen general de tu agencia <span className="text-phm-gold font-medium">PHMavericks</span>.
        </p>
      </header>

      {/* Hero de ingresos — solo SUPER_ADMIN y ADMIN */}
      {showFinancials && (
        <DashboardHero
          amount={incomeData?.total ?? 0}
          changePct={incomeData?.percentChange ?? null}
          series={incomeData?.series}
          rangeStart={incomeData?.rangeStart}
          rangeEnd={incomeData?.rangeEnd}
          selectedRange={incomeRange}
          onRangeChange={(range, opts) => {
            setIncomeRange(range)
            fetchIncome(range, opts)
          }}
          loading={loadingIncome}
        />
      )}

      {/* KPIs operativos — todos los roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={Users} value={stats.activeClients} title="Clientes Activos" subtitle="Con plan o proyecto activo" tone="red" href="/clientes" ctaLabel="Ver clientes" />
        <KPICard icon={Clock} value={stats.pendingContents} title="Contenidos Pendientes" subtitle="Planes y proyectos" tone="amber" href="/contenidos" ctaLabel="Ver pendientes" />
        <KPICard icon={CheckCircle2} value={stats.completedContents} title="Contenidos Entregados" subtitle="Entregados, publicados y completados" tone="green" href="/contenidos" ctaLabel="Ver entregados" />
        <KPICard icon={CalendarCheck} value={stats.completedPlans} title="Trabajos Completados" subtitle="Planes y proyectos completados" tone="blue" href="/planes" ctaLabel="Ver planes" />
        <KPICard icon={AlertTriangle} value={stats.delayedPlans} title="Trabajos Atrasados" subtitle="Planes y proyectos atrasados" tone="danger" href="/planes" ctaLabel="Ver atrasados" />
        <KPICard icon={Activity} value={stats.avgCompliance + '%'} title="Cumplimiento Promedio" subtitle="Planes y proyectos" tone="purple" progress={stats.avgCompliance} href="/reportes" ctaLabel="Ver detalle" />
      </div>

      {/* Bloque "Necesita atención" — alertas reales */}
      {(loadingAlerts || alerts.length > 0) && (
        <PremiumCard padding="none">
          <div className="flex items-center justify-between p-5 border-b border-phm-border-soft">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-phm-gold" />
              <div>
                <h2 className="font-semibold text-white tracking-wide">Necesita atención</h2>
                <p className="text-xs text-phm-gray-soft mt-0.5">Elementos que requieren acción hoy</p>
              </div>
            </div>
            {alerts.length > 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-phm-red/20 text-red-400 border border-red-900/40">
                {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {loadingAlerts ? (
            <div className="p-5 space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-12 skeleton-shimmer rounded-lg" />)}
            </div>
          ) : (
            <div className="divide-y divide-phm-border-soft">
              {alerts.map((alert) => (
                <Link key={alert.id} href={alert.href}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group">
                  {alertIcon(alert.type)}
                  <div className={`flex-1 pl-2 ${alertBorder(alert.type)} rounded-r-md px-3 py-1.5`}>
                    <p className="text-sm font-medium text-white leading-tight">{alert.title}</p>
                    <p className="text-xs text-phm-gray-soft mt-0.5 leading-relaxed">{alert.message}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-phm-gray-soft group-hover:text-phm-gold transition-colors flex-shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          )}
        </PremiumCard>
      )}

      {/* Gráficos — Estado de planes (todos los roles) + Pagos (solo admins) */}
      <div className={`grid grid-cols-1 gap-4 ${showFinancials ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-md'}`}>
        <ChartCard title="Estado de planes y proyectos" subtitle="Distribución actual" height={240}>
          <Donut data={planStatusDonut} centerValue={planStatusDonut.reduce((s, x) => s + x.value, 0)} centerLabel="Planes" />
        </ChartCard>
        {showFinancials && (
          <ChartCard title="Estado de pagos" subtitle="Sobre planes recientes" height={240}>
            <Donut data={paymentDonut} centerValue={paymentDonut.reduce((s, x) => s + x.value, 0)} centerLabel="Planes" />
          </ChartCard>
        )}
      </div>

      {/* Tabla Planes Recientes */}
      <PremiumCard padding="none">
        <div className="flex items-center justify-between p-5 border-b border-phm-border-soft">
          <div>
            <h2 className="font-semibold text-white tracking-wide">Planes Recientes</h2>
            <p className="text-xs text-phm-gray-soft mt-0.5">Últimos planes mensuales registrados</p>
          </div>
          <Link href="/planes" className="inline-flex items-center gap-1.5 text-sm font-medium text-phm-gold hover:text-phm-gold-bright transition-colors">
            Ver todos <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Cliente</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Período</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Estado</th>
                {showFinancials && <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Pago</th>}
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3 min-w-[160px]">Cumplimiento</th>
                {showFinancials && <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Precio</th>}
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-phm-border-soft">
              {(stats.recentPlans ?? []).map((plan: any) => {
                const compliance = calculateCompliance(plan, plan.contents || [])
                return (
                  <tr key={plan.id} className="row-hover">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-phm-red to-phm-red-mid text-white text-[11px] font-bold shadow-glow-red">
                          {(plan.client?.name || '?').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{plan.client?.name}</p>
                          <p className="text-xs text-phm-gray-soft">{plan.client?.business}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-phm-gray">
                      {getMonthName(plan.month)} {plan.year}
                    </td>
                    <td className="px-5 py-3.5">{planStatusBadge(plan.planStatus)}</td>
                    {showFinancials && <td className="px-5 py-3.5">{paymentStatusBadge(plan.paymentStatus)}</td>}
                    <td className="px-5 py-3.5">
                      <ProgressBar value={compliance.compliancePercentage} size="sm" />
                    </td>
                    {showFinancials && (
                      <td className="px-5 py-3.5 text-right text-sm font-semibold text-white tabular-nums">
                        {formatCurrency(plan.monthlyPrice)}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-right">
                      <Link href={'/planes/' + plan.id} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                        Ver <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {stats.recentPlans.length === 0 && (
            <div className="text-center py-12 text-phm-gray-soft text-sm">
              No hay planes creados todavía.{' '}
              <Link href="/planes/nuevo" className="text-phm-gold hover:text-phm-gold-bright underline">
                Crear uno
              </Link>
            </div>
          )}
        </div>
      </PremiumCard>
    </div>
  )
}
