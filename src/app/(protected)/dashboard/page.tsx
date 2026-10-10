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
  Users,
} from 'lucide-react'
import { DashboardStats } from '@/types'
import { ESTADOS_ACTIVOS } from '@/lib/projectStatus'
import { formatCurrency } from '@/lib/utils'
import { TYPE_LABELS_ES } from '@/lib/calendar-constants'
import PremiumCard from '@/components/ui/PremiumCard'
import HeroDashboard from '@/components/ui/HeroDashboard'
import GraficoIngresosGastos, { type PuntoMes } from '@/components/ui/GraficoIngresosGastos'
import AnilloProgreso from '@/components/ui/AnilloProgreso'
import Donut from '@/components/ui/Donut'

/** Rampa del rojo corporativo, de la categoría que más pesa a la que menos. */
const TONOS_GASTO = ['#C41E1E', '#9E1A1A', '#7A1717', '#5C1414', '#421010', '#2E0C0C']

interface Analitica {
  serie: PuntoMes[]
  distribucionGastos: { nombre: string; valor: number }[]
  avance: {
    cobradoMes: number
    metaMensual: number | null
    cobranza: number | null
    enProduccion: number
    cumplimientoEntregas: number | null
    entregasComprometidas: number
    entregasCumplidas: number
  }
  hayDatos: boolean
}

/** Un hueco sin datos se explica; no se deja en blanco ni se finge un cero. */
function EstadoVacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: { href: string; texto: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-white">{titulo}</p>
      <p className="max-w-[34ch] text-xs leading-relaxed text-phm-gray-soft">{texto}</p>
      {accion && (
        <Link href={accion.href} className="mt-2 text-xs font-semibold text-phm-red-bright transition-colors hover:text-red-400">
          {accion.texto}
        </Link>
      )}
    </div>
  )
}

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
  const [analitica, setAnalitica] = useState<Analitica | null>(null)
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
    if (!showFinancials) return
    fetch('/api/dashboard/analitica?meses=6')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAnalitica(d))
      .catch(() => setAnalitica(null))
  }, [showFinancials])

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
      {/* Bloque principal: la cifra del mes manda y la gráfica la acompaña. */}
      <HeroDashboard
        saludo={`Hola, ${greetingName} \u{1F44B}`}
        resumen={resumenOperativo}
        cobrado={showFinancials ? incomeData?.total ?? null : null}
        cambioPct={showFinancials ? incomeData?.percentChange ?? null : null}
        serie={incomeData?.series || []}
        serieMensual={analitica?.serie.map((m) => ({ label: m.etiqueta, value: m.ingresos })) || []}
        porCobrar={showFinancials ? receivable : null}
        gastos={showFinancials ? gastosMes : null}
        resultado={showFinancials ? resultadoOperativo : null}
        rango={incomeRange}
        onRangoChange={setIncomeRange}
        verFinanzas={showFinancials}
        cargando={loadingIncome}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores operativos">
        {[
          { label: 'Clientes activos', value: stats.activeClients, icon: Users, fondo: 'bg-phm-red-bright/16 text-phm-red-bright', halo: 'bg-phm-red-bright/25', href: '/clientes' },
          { label: 'Proyectos en producción', value: inProgressProjects, icon: FolderKanban, fondo: 'bg-white/[0.08] text-white', halo: 'bg-white/[0.12]', href: '/proyectos' },
          { label: 'Entregas pendientes', value: entregasPendientes, icon: Clock3, fondo: 'bg-phm-warn/16 text-phm-warn', halo: 'bg-phm-warn/20', href: '/proyectos' },
          { label: 'Entregables completados', value: stats.completedContents, icon: CheckCircle2, fondo: 'bg-phm-ok/16 text-phm-ok', halo: 'bg-phm-ok/20', href: '/reportes' },
        ].map(({ label, value, icon: Icon, fondo, halo, href }) => (
          <Link
            key={label}
            href={href}
            className="card-premium group relative block overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-premium-hover"
          >
            {/* Resplandor de la esquina: da relieve a la tarjeta sin añadir ruido. */}
            <span aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-90 ${halo}`} />
            <div className="relative flex items-center justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${fondo}`}>
                <Icon className="h-[17px] w-[17px]" strokeWidth={2.2} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-phm-gray-soft transition-colors group-hover:text-phm-red-bright" />
            </div>
            <p className="tabular relative mt-5 text-[32px] font-extrabold leading-none tracking-[-0.03em] text-white">{value}</p>
            <p className="relative mt-2 text-[12.5px] font-medium text-phm-gray">{label}</p>
          </Link>
        ))}
      </section>

      {/* Analítica. Solo para quien ve finanzas: el resto no debe inferir
          importes a partir de los gráficos. */}
      {showFinancials && (
        <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]" aria-label="Analítica">
          <PremiumCard padding="none">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Cobrado y pagado</h2>
                <p className="mt-0.5 text-xs text-phm-gray-soft">Últimos 6 meses · solo dinero que se movió</p>
              </div>
              <Link href="/finanzas" className="flex-none text-xs font-medium text-phm-red-bright transition-colors hover:text-red-400">
                Finanzas
              </Link>
            </div>
            <div className="px-5 py-5">
              {analitica?.hayDatos ? (
                <GraficoIngresosGastos datos={analitica.serie} />
              ) : (
                <EstadoVacio
                  titulo="Todavía no hay movimientos"
                  texto="En cuanto registres un cobro o un gasto, aquí verás su evolución mes a mes."
                />
              )}
            </div>
          </PremiumCard>

          <PremiumCard padding="none">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">En qué se va el dinero</h2>
              <p className="mt-0.5 text-xs text-phm-gray-soft">Gastos por categoría</p>
            </div>
            <div className="flex items-center justify-center px-5 py-5">
              {analitica && analitica.distribucionGastos.length > 0 ? (
                <Donut
                  data={analitica.distribucionGastos.map((c, i) => ({
                    label: c.nombre,
                    value: c.valor,
                    // Rampa del rojo corporativo por magnitud: la categoría que
                    // más pesa va más intensa. Al ir ordenadas y etiquetadas, la
                    // lectura no depende de distinguir matices.
                    color: TONOS_GASTO[Math.min(i, TONOS_GASTO.length - 1)],
                  }))}
                  size={168}
                  thickness={17}
                  centerLabel="Total"
                  centerValue={formatCurrency(
                    analitica.distribucionGastos.reduce((s, c) => s + c.valor, 0),
                  )}
                />
              ) : (
                <EstadoVacio
                  titulo="Sin gastos registrados"
                  texto="Registra un gasto y verás aquí su reparto por categoría."
                  accion={{ href: '/gastos', texto: 'Ir a Gastos' }}
                />
              )}
            </div>
          </PremiumCard>
        </section>
      )}

      {/* Anillos de avance */}
      {showFinancials && analitica && (
        <PremiumCard padding="none">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Avance</h2>
            <p className="mt-0.5 text-xs text-phm-gray-soft">
              Dónde está la operación respecto a lo comprometido
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 px-5 py-6 sm:grid-cols-4">
            <AnilloProgreso
              valor={analitica.avance.metaMensual
                ? Math.round((analitica.avance.cobradoMes / analitica.avance.metaMensual) * 100)
                : null}
              etiqueta="Cobrado este mes"
              centro={formatCurrency(analitica.avance.cobradoMes)}
              pie={analitica.avance.metaMensual ? `de ${formatCurrency(analitica.avance.metaMensual)}` : undefined}
              tono="ok"
            />
            <AnilloProgreso
              valor={analitica.avance.cobranza}
              etiqueta="Cobranza de proyectos"
              pie={analitica.avance.cobranza !== null ? 'de lo contratado' : undefined}
              tono="rojo"
            />
            <AnilloProgreso
              valor={analitica.avance.cumplimientoEntregas}
              etiqueta="Entregas cumplidas"
              pie={analitica.avance.entregasComprometidas > 0
                ? `${analitica.avance.entregasCumplidas} de ${analitica.avance.entregasComprometidas}`
                : undefined}
              tono="aviso"
            />
            <AnilloProgreso
              valor={analitica.avance.enProduccion > 0 ? 100 : null}
              etiqueta="En producción"
              centro={String(analitica.avance.enProduccion)}
              pie={analitica.avance.enProduccion === 1 ? 'proyecto' : 'proyectos'}
              tono="neutro"
            />
          </div>
        </PremiumCard>
      )}

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
