'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Plus,
  Users,
} from 'lucide-react'
import { DashboardStats } from '@/types'
import { ESTADOS_ACTIVOS } from '@/lib/projectStatus'
import { formatCurrency } from '@/lib/utils'
import { TYPE_LABELS_ES } from '@/lib/calendar-constants'
import PremiumCard from '@/components/ui/PremiumCard'
import DashboardFinancialSummary from '@/components/ui/DashboardFinancialSummary'

interface IncomeData {
  total: number
  percentChange: number | null
  series: { label: string; value: number }[]
}

interface Alert {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
  href: string
}

interface Project {
  id: string
  nombre: string
  estado: string
  client?: { name: string }
  fechaEntrega?: string | null
  saldoPendiente?: number | null
}

// Misma lista que usa la API, para que las tarjetas no cuenten distinto.
const ACTIVE_PROJECT_STATES = ESTADOS_ACTIVOS
// En producción activa: ya se grabó o se está editando.
const IN_PROGRESS_STATES = ['GRABADO', 'EN_EDICION', 'EN_PROCESO']

function formatEventDate(value: string) {
  const date = new Date(value)
  return {
    day: date.toLocaleDateString('es-EC', { day: '2-digit' }),
    month: date.toLocaleDateString('es-EC', { month: 'short' }).replace('.', '').toUpperCase(),
    time: date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En proceso',
    EN_EDICION: 'En edición',
    APROBADO: 'Aprobado',
    ATRASADO: 'Atrasado',
  }
  return labels[status] || status
}

function statusClass(status: string) {
  if (status === 'ATRASADO') return 'bg-red-950/50 text-red-300 border-red-900/60'
  if (IN_PROGRESS_STATES.includes(status)) return 'bg-amber-950/45 text-amber-300 border-amber-900/60'
  return 'bg-white/[0.05] text-phm-gray border-white/[0.08]'
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 w-72 skeleton-shimmer rounded-xl" />
      <div className="h-40 w-full skeleton-shimmer rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 skeleton-shimmer rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="h-72 skeleton-shimmer rounded-xl" />
        <div className="h-72 skeleton-shimmer rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [gastosMes, setGastosMes] = useState<number | null>(null)
  const [resultadoOperativo, setResultadoOperativo] = useState<number | null>(null)
  const [entregasPendientes, setEntregasPendientes] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null)
  const [receivable, setReceivable] = useState<number | null>(null)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')
  const [incomeRange, setIncomeRange] = useState('this_month')
  const [loading, setLoading] = useState(true)
  const [loadingIncome, setLoadingIncome] = useState(false)
  const [loadError, setLoadError] = useState<'auth' | 'unknown' | null>(null)

  const showFinancials = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  const fetchIncome = useCallback(async (range: string) => {
    setLoadingIncome(true)
    try {
      const response = await fetch(`/api/dashboard/income?range=${range}`)
      if (response.ok) setIncomeData(await response.json())
    } finally {
      setLoadingIncome(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then((user) => {
        if (user) {
          setUserRole(user.role || '')
          setUserName(user.name || '')
        }
      })
      .catch(() => {})

    Promise.all([
      fetch('/api/dashboard').then((response) => {
        if (response.status === 401) {
          setLoadError('auth')
          return null
        }
        if (!response.ok) throw new Error('Dashboard fetch failed')
        return response.json()
      }),
      fetch('/api/proyectos').then((response) => response.ok ? response.json() : []),
      fetch('/api/calendario?upcoming=6').then((response) => response.ok ? response.json() : []),
    ])
      .then(([dashboard, projectData, eventData]) => {
        if (dashboard) {
          setStats({
            activeClients: dashboard.activeClients ?? 0,
            pendingContents: dashboard.pendingContents ?? 0,
            completedContents: dashboard.completedContents ?? 0,
            avgCompliance: dashboard.avgCompliance ?? 0,
          })
          setReceivable(typeof dashboard.porCobrar === 'number' ? dashboard.porCobrar : null)
          setGastosMes(typeof dashboard.gastosMes === 'number' ? dashboard.gastosMes : null)
          setResultadoOperativo(typeof dashboard.resultadoOperativo === 'number' ? dashboard.resultadoOperativo : null)
          setEntregasPendientes(dashboard.entregasPendientes ?? 0)
        }
        setProjects(Array.isArray(projectData) ? projectData : [])
        setUpcomingEvents(Array.isArray(eventData) ? eventData : [])
      })
      .catch(() => setLoadError('unknown'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (showFinancials) fetchIncome(incomeRange)
  }, [fetchIncome, incomeRange, showFinancials])

  useEffect(() => {
    if (!userRole) return
    fetch('/api/dashboard/alerts')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setAlerts([]))
  }, [userRole])

  const activeProjects = useMemo(() => projects.filter((project) => ACTIVE_PROJECT_STATES.includes(project.estado)), [projects])
  const inProgressProjects = useMemo(() => projects.filter((project) => IN_PROGRESS_STATES.includes(project.estado)).length, [projects])
  const attentionItems = alerts.slice(0, 4)
  const greetingName = userName ? userName.split(' ')[0] : 'Admin'

  // Una frase con lo que de verdad importa hoy. Se arma solo con lo que hay:
  // si no hay entregas ni saldo pendiente, no se inventa una línea vacía.
  const resumenOperativo = useMemo(() => {
    const partes: string[] = []
    const enCurso = activeProjects.length
    partes.push(enCurso === 1 ? '1 proyecto en curso' : `${enCurso} proyectos en curso`)
    if (entregasPendientes > 0) {
      partes.push(entregasPendientes === 1 ? '1 entrega pendiente' : `${entregasPendientes} entregas pendientes`)
    }
    if (showFinancials && receivable && receivable > 0) {
      partes.push(`${formatCurrency(receivable)} por cobrar`)
    }
    return partes.join(' · ')
  }, [activeProjects.length, entregasPendientes, receivable, showFinancials])

  if (loading) return <DashboardSkeleton />
  if (!stats) {
    return (
      <PremiumCard padding="lg" className="text-center">
        <p className="text-lg font-semibold text-white">
          {loadError === 'auth' ? 'Tu sesión no está activa' : 'No se pudo cargar el dashboard'}
        </p>
        <p className="mt-2 text-sm text-phm-gray-soft">
          {loadError === 'auth' ? 'Inicia sesión para consultar tus indicadores y actividades.' : 'Intenta actualizar la página.'}
        </p>
        {loadError === 'auth' && (
          <Link href="/login" className="mt-5 inline-flex items-center rounded-lg bg-phm-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-phm-red-hover">
            Iniciar sesión
          </Link>
        )}
      </PremiumCard>
    )
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      {/* Tarjeta principal: lo primero que se ve al abrir la app. */}
      <section className="card-hero px-5 py-6 md:px-7 md:py-7">
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-phm-gray">
              Hola, {greetingName} <span aria-hidden>👋</span>
            </p>
            <h1 className="mt-2 text-[26px] font-extrabold leading-[1.12] tracking-tight text-white md:text-4xl">
              Tu producción,<br className="md:hidden" /> bajo control
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-phm-gray">{resumenOperativo}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={incomeRange}
              onChange={(event) => setIncomeRange(event.target.value)}
              className="h-11 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3.5 text-xs font-semibold text-phm-gray outline-none transition-colors focus:border-phm-red-bright/60"
              aria-label="Periodo del dashboard"
            >
              <option value="this_month">Este mes</option>
              <option value="previous_month">Mes anterior</option>
              <option value="this_year">Este año</option>
              <option value="all_time">Histórico</option>
            </select>
            <Link href="/proyectos/nuevo" className="btn-primario flex-1 md:flex-none">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Nuevo proyecto
            </Link>
          </div>
        </div>
      </section>

      <DashboardFinancialSummary
        income={showFinancials ? incomeData?.total ?? null : null}
        incomeChange={showFinancials ? incomeData?.percentChange ?? null : null}
        incomeSeries={incomeData?.series?.map((item) => item.value) || []}
        activeProjects={activeProjects.length}
        receivable={showFinancials ? receivable : null}
        expenses={showFinancials ? gastosMes : null}
        operatingResult={showFinancials ? resultadoOperativo : null}
        showFinancials={showFinancials}
        loading={loadingIncome}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores operativos">
        {[
          { label: 'Clientes activos', value: stats.activeClients, icon: Users, fondo: 'bg-phm-red-bright/14 text-phm-red-bright', href: '/clientes' },
          { label: 'Proyectos en producción', value: inProgressProjects, icon: FolderKanban, fondo: 'bg-white/[0.07] text-white', href: '/proyectos' },
          { label: 'Entregas pendientes', value: entregasPendientes, icon: Clock3, fondo: 'bg-phm-warn/14 text-phm-warn', href: '/proyectos' },
          { label: 'Entregables completados', value: stats.completedContents, icon: CheckCircle2, fondo: 'bg-phm-ok/14 text-phm-ok', href: '/reportes' },
        ].map(({ label, value, icon: Icon, fondo, href }) => (
          <Link
            key={label}
            href={href}
            className="card-premium group block p-4 transition-shadow hover:shadow-premium-hover"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-[26px] w-[26px] items-center justify-center rounded-[9px] ${fondo}`}>
                <Icon className="h-[14px] w-[14px]" strokeWidth={2.2} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-phm-gray-soft transition-colors group-hover:text-phm-red-bright" />
            </div>
            <p className="tabular mt-4 text-[26px] font-extrabold leading-none tracking-tight text-white">{value}</p>
            <p className="mt-1.5 text-[13px] text-phm-gray">{label}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <PremiumCard padding="none">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div className="flex items-center gap-2.5"><AlertCircle className="h-4 w-4 text-phm-red-bright" /><div><h2 className="text-sm font-semibold text-white">Requieren atención</h2><p className="mt-0.5 text-xs text-phm-gray-soft">Acciones que pueden bloquear la operación</p></div></div>
            <Link href="/reportes" className="text-xs font-medium text-phm-red-bright hover:text-red-400">Ver todo</Link>
          </div>
          {attentionItems.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-phm-gray-soft">No hay alertas pendientes.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {attentionItems.map((alert) => (
                <Link key={alert.id} href={alert.href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${alert.type === 'danger' ? 'bg-phm-red-bright' : alert.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{alert.title}</p><p className="mt-0.5 truncate text-xs text-phm-gray-soft">{alert.message}</p></div>
                  <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-phm-gray-soft transition-colors group-hover:text-phm-red-bright" />
                </Link>
              ))}
            </div>
          )}
        </PremiumCard>

        <PremiumCard padding="none">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div className="flex items-center gap-2.5"><CalendarClock className="h-4 w-4 text-phm-red-bright" /><div><h2 className="text-sm font-semibold text-white">Próximas fechas</h2><p className="mt-0.5 text-xs text-phm-gray-soft">Agenda inmediata</p></div></div><Link href="/calendario" className="text-xs font-medium text-phm-red-bright hover:text-red-400">Ver calendario</Link></div>
          {upcomingEvents.length === 0 ? <div className="px-5 py-12 text-center text-sm text-phm-gray-soft">No hay fechas próximas.</div> : <div className="divide-y divide-white/[0.06]">{upcomingEvents.slice(0, 4).map((event: any) => { const date = formatEventDate(event.startDateTime); return <div key={event.id} className="flex items-center gap-3 px-5 py-3.5"><div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-white/[0.045] ring-1 ring-white/[0.08]"><span className="text-sm font-semibold text-white">{date.day}</span><span className="text-[9px] font-bold text-phm-red-bright">{date.month}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{event.title}</p><p className="mt-0.5 truncate text-xs text-phm-gray-soft">{date.time}{event.clientName ? ` · ${event.clientName}` : ''}</p></div><span className="hidden text-[10px] text-phm-gray-soft sm:block">{TYPE_LABELS_ES[event.type] || event.type}</span></div> })}</div>}
        </PremiumCard>
      </section>


      <div className="flex justify-end"><Link href="/reportes" className="inline-flex items-center gap-1.5 text-xs text-phm-gray-soft transition-colors hover:text-phm-red-bright"><span className="h-1.5 w-1.5 rounded-full bg-phm-red-bright" /> Ver actividad reciente <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
    </div>
  )
}
