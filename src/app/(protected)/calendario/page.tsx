'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles, ChevronLeft, ChevronRight, Plus, X,
  Calendar, Clock, MapPin, User, Edit2, Trash2,
  RefreshCw, Link2, Video, Package, Users, Check,
} from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'

// ── Tipos ──────────────────────────────────────────────────────────

interface CalEvent {
  id: string
  title: string
  type: string
  startDateTime: string
  endDateTime: string
  location?: string | null
  notes?: string | null
  clientId?: string | null
  clientName?: string | null
  status: string
  source: string
  syncStatus: string
}

interface ClientOption {
  id: string
  name: string
  business: string
}

const EMPTY_FORM = {
  title: '',
  type: 'OTRO',
  startDate: '',
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  notes: '',
  clientId: '',
  clientName: '',
  status: 'AGENDADO',
}

const TYPE_LABELS: Record<string, string> = {
  GRABACION: 'Grabación',
  SESION_FOTOGRAFICA: 'Sesión fotográfica',
  REUNION: 'Reunión',
  ENTREGA: 'Entrega',
  EDICION: 'Edición',
  EVENTO: 'Evento',
  OTRO: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
}

const TYPE_COLORS: Record<string, string> = {
  GRABACION: '#dc2626',
  SESION_FOTOGRAFICA: '#d97706',
  REUNION: '#2563eb',
  ENTREGA: '#059669',
  EDICION: '#7c3aed',
  EVENTO: '#db2777',
  OTRO: '#6b7280',
}

const TYPE_BADGE: Record<string, string> = {
  GRABACION: 'bg-red-950/60 text-red-300 border-red-900/60',
  SESION_FOTOGRAFICA: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  REUNION: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  ENTREGA: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  EDICION: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  EVENTO: 'bg-pink-950/60 text-pink-300 border-pink-800/60',
  OTRO: 'bg-phm-surface text-phm-gray border-phm-border-soft',
}

const STATUS_BADGE: Record<string, string> = {
  AGENDADO: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  REALIZADO: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  CANCELADO: 'bg-red-950/60 text-red-300 border-red-900/60',
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_MINI  = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// ── Helpers ────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Componente principal ───────────────────────────────────────────

export default function CalendarioPage() {
  const today = new Date()
  const [currentYear, setCurrentYear]   = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [events, setEvents]             = useState<CalEvent[]>([])
  const [clients, setClients]           = useState<ClientOption[]>([])
  const [loading, setLoading]           = useState(true)

  // Panel derecho
  const [selectedDate, setSelectedDate]               = useState<string | null>(null)
  const [dayEvents, setDayEvents]                     = useState<CalEvent[]>([])
  const [dayLoading, setDayLoading]                   = useState(false)
  const [selectedEventDetail, setSelectedEventDetail] = useState<CalEvent | null>(null)

  // Filtros de tipo
  const [filterTypes, setFilterTypes] = useState<string[]>([])

  // Formulario
  const [showForm, setShowForm]         = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [form, setForm]                 = useState({ ...EMPTY_FORM })
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')

  // Eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Google Calendar
  const [googleConnected, setGoogleConnected]   = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState(true)
  const [syncing, setSyncing]                   = useState(false)
  const [syncMsg, setSyncMsg]                   = useState('')
  const googleChecked = useRef(false)

  useEffect(() => {
    if (googleChecked.current) return
    googleChecked.current = true
    const params = new URLSearchParams(window.location.search)
    const g = params.get('google')
    if (g === 'connected') { setSyncMsg('Google Calendar conectado correctamente'); setGoogleConnected(true); window.history.replaceState({}, '', '/calendario') }
    else if (g === 'error') { setSyncMsg('Error al conectar con Google Calendar'); window.history.replaceState({}, '', '/calendario') }
    else if (g === 'no-config') { setSyncMsg('Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor'); window.history.replaceState({}, '', '/calendario') }
    fetch('/api/calendario/google-status').then(r => r.ok ? r.json() : null).then(d => { if (d) { setGoogleConnected(d.connected); setGoogleConfigured(d.configured) } }).catch(() => {})
  }, [])

  const handleGoogleSync = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/calendario/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setSyncMsg(data.error || 'Error al sincronizar'); return }
      const parts: string[] = []
      if (data.phmToGoogle > 0) parts.push(`${data.phmToGoogle} enviado${data.phmToGoogle !== 1 ? 's' : ''} a Google`)
      if (data.googleToPHM > 0) parts.push(`${data.googleToPHM} importado${data.googleToPHM !== 1 ? 's' : ''} de Google`)
      if (data.cancelled > 0) parts.push(`${data.cancelled} cancelado${data.cancelled !== 1 ? 's' : ''}`)
      if (data.readOnly > 0) parts.push(`${data.readOnly} evento${data.readOnly !== 1 ? 's' : ''} externo${data.readOnly !== 1 ? 's' : ''} (solo lectura)`)
      let msg = parts.length > 0 ? `Sincronizado: ${parts.join(' · ')}` : 'Todo sincronizado'
      if (data.errors > 0 && data.errorDetails?.length > 0) msg += ` · ${data.errors} error${data.errors !== 1 ? 'es' : ''}: ${data.errorDetails.slice(0, 2).join(' | ')}`
      else if (data.errors > 0) msg += ` · ${data.errors} error${data.errors !== 1 ? 'es' : ''}`
      setSyncMsg(msg); fetchMonthEvents()
    } catch { setSyncMsg('Error de conexión') }
    finally { setSyncing(false) }
  }

  const handleGoogleDisconnect = async () => {
    await fetch('/api/auth/google/disconnect', { method: 'POST' })
    setGoogleConnected(false); setSyncMsg('Google Calendar desconectado')
  }

  const fetchMonthEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/calendario?year=${currentYear}&month=${currentMonth}`)
      if (res.ok) setEvents(await res.json())
    } finally { setLoading(false) }
  }, [currentYear, currentMonth])

  useEffect(() => { fetchMonthEvents() }, [fetchMonthEvents])

  useEffect(() => {
    fetch('/api/clientes').then(r => r.ok ? r.json() : []).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const openDay = async (dateStr: string) => {
    setSelectedDate(dateStr); setSelectedEventDetail(null); setDayLoading(true)
    try {
      const res = await fetch(`/api/calendario?date=${dateStr}`)
      if (res.ok) setDayEvents(await res.json())
    } finally { setDayLoading(false) }
  }

  const closeDay = () => { setSelectedDate(null); setDayEvents([]); setSelectedEventDetail(null) }

  const prevMonth = () => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  const nextMonth = () => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }
  const goToday   = () => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth() + 1) }

  // ── Grid del mes ───────────────────────────────────────────────

  const firstDayOfMonth  = new Date(currentYear, currentMonth - 1, 1).getDay()
  const daysInMonth      = new Date(currentYear, currentMonth, 0).getDate()
  const daysInPrevMonth  = new Date(currentYear, currentMonth - 1, 0).getDate()
  const cells: { day: number; month: 'prev' | 'current' | 'next'; dateStr: string }[] = []

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = currentMonth === 1 ? 12 : currentMonth - 1
    const y = currentMonth === 1 ? currentYear - 1 : currentYear
    cells.push({ day: d, month: 'prev', dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month: 'current', dateStr: `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  for (let d = 1; d <= 42 - cells.length; d++) {
    const m = currentMonth === 12 ? 1 : currentMonth + 1
    const y = currentMonth === 12 ? currentYear + 1 : currentYear
    cells.push({ day: d, month: 'next', dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }

  const todayStr = toLocalDateStr(today)

  const filteredEvents = filterTypes.length > 0 ? events.filter(ev => filterTypes.includes(ev.type)) : events
  const eventsPerDay: Record<string, CalEvent[]> = {}
  filteredEvents.forEach(ev => {
    const d = toLocalDateStr(new Date(ev.startDateTime))
    if (!eventsPerDay[d]) eventsPerDay[d] = []
    eventsPerDay[d].push(ev)
  })

  // ── KPIs ───────────────────────────────────────────────────────
  const upcomingEvents = events.filter(ev => toLocalDateStr(new Date(ev.startDateTime)) >= todayStr)
  const kpis = [
    { label: 'Próximos eventos',    value: upcomingEvents.length,                                             color: 'text-phm-gold',    bg: 'bg-phm-gold/10',      Icon: Calendar },
    { label: 'Grabaciones',         value: events.filter(ev => ev.type === 'GRABACION').length,               color: 'text-red-400',     bg: 'bg-red-950/30',       Icon: Video    },
    { label: 'Entregas pendientes', value: events.filter(ev => ev.type === 'ENTREGA' && ev.status !== 'REALIZADO').length, color: 'text-emerald-400', bg: 'bg-emerald-950/30', Icon: Package },
    { label: 'Reuniones',           value: events.filter(ev => ev.type === 'REUNION').length,                 color: 'text-blue-400',    bg: 'bg-blue-950/30',      Icon: Users    },
  ]

  // ── Formulario ─────────────────────────────────────────────────
  const openNewForm = (dateStr?: string, hour?: number) => {
    setEditingEvent(null)
    const h  = hour !== undefined ? String(hour).padStart(2, '0') : '09'
    const h2 = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10'
    setForm({ ...EMPTY_FORM, startDate: dateStr || todayStr, startTime: `${h}:00`, endTime: `${h2}:00` })
    setFormError(''); setShowForm(true)
  }

  const openEditForm = (ev: CalEvent) => {
    const start = new Date(ev.startDateTime); const end = new Date(ev.endDateTime)
    setEditingEvent(ev)
    setForm({
      title: ev.title, type: ev.type,
      startDate: toLocalDateStr(start),
      startTime: `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`,
      endTime:   `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`,
      location: ev.location || '', notes: ev.notes || '',
      clientId: ev.clientId || '', clientName: ev.clientName || '', status: ev.status,
    })
    setFormError(''); setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditingEvent(null); setFormError('') }

  const handleFormChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'clientId') {
      const c = clients.find(c => c.id === value)
      setForm(f => ({ ...f, clientId: value, clientName: c ? c.name : '' }))
    }
  }

  const handleSave = async () => {
    if (!form.title.trim())           { setFormError('El título es obligatorio'); return }
    if (!form.startDate)              { setFormError('La fecha es obligatoria'); return }
    if (!form.startTime)              { setFormError('La hora de inicio es obligatoria'); return }
    if (!form.endTime)                { setFormError('La hora de fin es obligatoria'); return }
    if (form.endTime <= form.startTime) { setFormError('La hora de fin debe ser mayor a la de inicio'); return }
    setSaving(true); setFormError('')
    try {
      const payload = {
        title: form.title.trim(), type: form.type,
        startDateTime: `${form.startDate}T${form.startTime}:00`,
        endDateTime:   `${form.startDate}T${form.endTime}:00`,
        location: form.location || null, notes: form.notes || null,
        clientId: form.clientId || null, clientName: form.clientName || null, status: form.status,
      }
      const url    = editingEvent ? `/api/calendario/${editingEvent.id}` : '/api/calendario'
      const method = editingEvent ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json(); setFormError(err.error || 'Error al guardar'); return }
      closeForm(); fetchMonthEvents()
      if (selectedDate) openDay(selectedDate)
    } catch { setFormError('Error de conexión') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await fetch(`/api/calendario/${id}`, { method: 'DELETE' })
      setDeleteId(null)
      if (selectedEventDetail?.id === id) setSelectedEventDetail(null)
      fetchMonthEvents()
      if (selectedDate) openDay(selectedDate)
    } finally { setDeleting(false) }
  }

  const toggleFilterType = (type: string) =>
    setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])

  const inputCls  = 'w-full px-3 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-3 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls  = 'block text-xs font-medium text-phm-gray-soft mb-1.5'

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-phm-gold" />
          <span className="text-gold-premium">Agenda de Producción</span>
        </div>
        <div className="flex items-start justify-between mt-1 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Calendario</h1>
            <p className="text-phm-gray-soft text-sm mt-1">Organiza grabaciones, sesiones, reuniones y más</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {googleConnected ? (
              <>
                <button onClick={handleGoogleSync} disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-gold/40 hover:text-white bg-phm-surface rounded-lg transition-all disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                <button onClick={handleGoogleDisconnect} title="Desconectar Google Calendar"
                  className="p-2 text-phm-gray-soft hover:text-red-400 hover:bg-phm-surface rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <a href={googleConfigured ? '/api/auth/google' : undefined}
                onClick={!googleConfigured ? () => setSyncMsg('Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor') : undefined}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-gold/40 hover:text-white bg-phm-surface rounded-lg transition-all cursor-pointer">
                <Link2 className="w-3.5 h-3.5" />
                Conectar Google
              </a>
            )}
            <button onClick={() => openNewForm()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Nuevo evento
            </button>
          </div>
        </div>
      </header>

      {/* ── Sync message ───────────────────────────────────────── */}
      {syncMsg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm flex items-center justify-between gap-3 ${syncMsg.includes('Error') || syncMsg.includes('error') || syncMsg.includes('Configura') ? 'bg-red-950/60 border border-red-900/60 text-red-300' : 'bg-phm-surface border border-phm-border-soft text-phm-gray'}`}>
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg('')} className="text-phm-gray-soft hover:text-phm-gray flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, color, bg, Icon }) => (
          <PremiumCard key={label} padding="md">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-phm-gray-soft leading-tight mt-0.5">{label}</p>
              </div>
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* ── 3-column layout ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-4 items-start">

        {/* ═══════════════ LEFT ═══════════════ */}
        <div className="space-y-3">

          {/* Mini calendar */}
          <PremiumCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-phm-surface rounded-md text-phm-gray hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-white">
                {MONTHS[currentMonth - 1].slice(0, 3).toUpperCase()} {currentYear}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-phm-surface rounded-md text-phm-gray hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS_MINI.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-phm-gray-soft py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell, idx) => {
                const isToday    = cell.dateStr === todayStr
                const isSelected = cell.dateStr === selectedDate
                const hasEvents  = (eventsPerDay[cell.dateStr] || []).length > 0
                const isCurrent  = cell.month === 'current'
                return (
                  <button
                    key={idx}
                    onClick={() => openDay(cell.dateStr)}
                    className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-md text-[11px] font-medium transition-all
                      ${!isCurrent ? 'opacity-20' : ''}
                      ${isToday ? 'text-white' : isSelected ? 'text-phm-gold' : 'text-phm-gray hover:text-white'}
                      ${isSelected && !isToday ? 'bg-phm-surface border border-phm-gold/30' : isToday ? '' : 'hover:bg-phm-surface'}
                    `}
                    style={isToday ? { backgroundColor: '#8B0000' } : {}}
                  >
                    {cell.day}
                    {hasEvents && isCurrent && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full"
                        style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.6)' : '#C9A84C' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </PremiumCard>

          {/* Filtros por tipo */}
          <PremiumCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-phm-gray-soft uppercase tracking-widest">Tipo de evento</h3>
              {filterTypes.length > 0 && (
                <button onClick={() => setFilterTypes([])} className="text-[10px] text-phm-gray-soft hover:text-phm-gold transition-colors">
                  Limpiar
                </button>
              )}
            </div>
            <div className="space-y-1">
              {Object.entries(TYPE_LABELS).map(([type, label]) => {
                const isActive = filterTypes.includes(type)
                const count    = events.filter(ev => ev.type === type).length
                return (
                  <button key={type} onClick={() => toggleFilterType(type)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all
                      ${isActive ? 'bg-phm-surface border border-phm-gold/20' : 'hover:bg-phm-surface/50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
                      <span className={isActive ? 'text-white font-medium' : 'text-phm-gray'}>{label}</span>
                    </div>
                    <span className={`text-[10px] ${count > 0 ? 'text-phm-gray' : 'text-phm-gray-soft'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </PremiumCard>

          {/* Próximos eventos */}
          {upcomingEvents.length > 0 && (
            <PremiumCard padding="md">
              <h3 className="text-[10px] font-bold text-phm-gray-soft uppercase tracking-widest mb-3">Próximos</h3>
              <div className="space-y-1.5">
                {upcomingEvents.slice(0, 5).map(ev => (
                  <button key={ev.id}
                    onClick={() => { setSelectedEventDetail(ev); setSelectedDate(toLocalDateStr(new Date(ev.startDateTime))) }}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-phm-surface transition-all group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[ev.type] }} />
                      <span className="text-xs font-medium text-white truncate group-hover:text-phm-gold transition-colors">{ev.title}</span>
                    </div>
                    <p className="text-[10px] text-phm-gray-soft pl-3.5">
                      {new Date(ev.startDateTime).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {formatTime(ev.startDateTime)}
                    </p>
                  </button>
                ))}
              </div>
            </PremiumCard>
          )}
        </div>

        {/* ═══════════════ CENTER ═══════════════ */}
        <PremiumCard padding="none" className="overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-phm-border-soft">
            <div className="flex items-center gap-1.5">
              <button onClick={prevMonth} className="p-1.5 hover:bg-phm-surface rounded-lg text-phm-gray hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-white min-w-[170px] text-center select-none">
                {MONTHS[currentMonth - 1]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-phm-surface rounded-lg text-phm-gray hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={goToday}
              className="px-3 py-1.5 text-xs font-medium text-phm-gray border border-phm-border-soft hover:border-phm-gold/40 hover:text-white rounded-lg transition-all">
              Hoy
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 border-b border-phm-border-soft bg-white/[0.015]">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-phm-gray-soft text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-phm-border-soft">
              {cells.map((cell, idx) => {
                const isToday    = cell.dateStr === todayStr
                const isSelected = cell.dateStr === selectedDate
                const cellEvents = eventsPerDay[cell.dateStr] || []
                const isCurrent  = cell.month === 'current'

                return (
                  <button
                    key={idx}
                    onClick={() => openDay(cell.dateStr)}
                    className={`relative min-h-[80px] sm:min-h-[96px] p-1.5 text-left flex flex-col transition-all
                      ${!isCurrent ? 'opacity-20' : ''}
                      ${isSelected ? 'bg-phm-surface/70' : 'hover:bg-phm-surface/30'}
                    `}
                  >
                    {/* Day number */}
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 flex-shrink-0
                      ${isToday ? 'text-white' : isSelected ? 'text-phm-gold' : isCurrent ? 'text-phm-gray' : 'text-phm-gray-soft'}
                    `}
                      style={isToday ? { backgroundColor: '#8B0000' } : {}}
                    >
                      {cell.day}
                    </span>

                    {/* Events */}
                    {cellEvents.length > 0 && (
                      <div className="space-y-0.5 w-full min-w-0">
                        {cellEvents.slice(0, 2).map(ev => (
                          <div key={ev.id}
                            className="text-[9px] sm:text-[10px] leading-tight px-1.5 py-0.5 rounded font-medium truncate w-full"
                            style={{ backgroundColor: TYPE_COLORS[ev.type] + '22', color: TYPE_COLORS[ev.type], borderLeft: `2px solid ${TYPE_COLORS[ev.type]}` }}>
                            <span className="hidden sm:inline">{ev.title}</span>
                            <span className="sm:hidden">·</span>
                          </div>
                        ))}
                        {cellEvents.length > 2 && (
                          <p className="text-[9px] text-phm-gold px-1.5">+{cellEvents.length - 2}</p>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </PremiumCard>

        {/* ═══════════════ RIGHT ═══════════════ */}
        <div className="space-y-3">
          {selectedEventDetail ? (
            // ── Detalle del evento ─────────────────────────────
            <PremiumCard padding="md">
              <div className="flex items-start justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${TYPE_BADGE[selectedEventDetail.type] || TYPE_BADGE.OTRO}`}>
                  {TYPE_LABELS[selectedEventDetail.type] || selectedEventDetail.type}
                </span>
                <button onClick={() => setSelectedEventDetail(null)} className="text-phm-gray-soft hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-base font-bold text-white mb-4 leading-tight">{selectedEventDetail.title}</h3>

              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-phm-gray-soft mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-phm-gray-soft uppercase tracking-wide mb-0.5">Fecha y hora</p>
                    <p className="text-sm text-white">{cap(formatDateLabel(selectedEventDetail.startDateTime))}</p>
                    <p className="text-xs text-phm-gray">{formatTime(selectedEventDetail.startDateTime)} – {formatTime(selectedEventDetail.endDateTime)}</p>
                  </div>
                </div>

                {selectedEventDetail.clientName && (
                  <div className="flex items-start gap-2.5">
                    <User className="w-3.5 h-3.5 text-phm-gray-soft mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-phm-gray-soft uppercase tracking-wide mb-0.5">Cliente</p>
                      <p className="text-sm text-white">{selectedEventDetail.clientName}</p>
                    </div>
                  </div>
                )}

                {selectedEventDetail.location && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-phm-gray-soft mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-phm-gray-soft uppercase tracking-wide mb-0.5">Ubicación</p>
                      <p className="text-sm text-white">{selectedEventDetail.location}</p>
                    </div>
                  </div>
                )}

                {selectedEventDetail.notes && (
                  <div className="flex items-start gap-2.5">
                    <Edit2 className="w-3.5 h-3.5 text-phm-gray-soft mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-phm-gray-soft uppercase tracking-wide mb-0.5">Notas</p>
                      <p className="text-sm text-phm-gray leading-relaxed">{selectedEventDetail.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-phm-gray-soft flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-phm-gray-soft uppercase tracking-wide">Estado:</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_BADGE[selectedEventDetail.status] || STATUS_BADGE.AGENDADO}`}>
                      {STATUS_LABELS[selectedEventDetail.status] || selectedEventDetail.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-phm-border-soft">
                <button
                  onClick={() => { setSelectedEventDetail(null); openEditForm(selectedEventDetail) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => { setSelectedEventDetail(null); setDeleteId(selectedEventDetail.id) }}
                  className="px-3 py-2 text-xs text-red-400 border border-red-900/40 hover:border-red-700/60 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </PremiumCard>

          ) : selectedDate ? (
            // ── Eventos del día ────────────────────────────────
            <PremiumCard padding="none">
              <div className="flex items-center justify-between px-4 py-3 border-b border-phm-border-soft">
                <div>
                  <p className="text-[10px] text-phm-gray-soft uppercase tracking-widest">Eventos del día</p>
                  <p className="text-sm font-semibold text-white mt-0.5 capitalize">
                    {cap(formatDateLabel(selectedDate + 'T12:00:00'))}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openNewForm(selectedDate)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-phm-gold border border-phm-gold/30 hover:border-phm-gold/60 bg-phm-surface rounded-lg transition-all">
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                  <button onClick={closeDay} className="p-1.5 text-phm-gray-soft hover:text-white hover:bg-phm-surface rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3">
                {dayLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}
                  </div>
                ) : dayEvents.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-10 h-10 rounded-full bg-phm-surface border border-phm-border-soft flex items-center justify-center mx-auto mb-3 opacity-50">
                      <Calendar className="w-5 h-5 text-phm-gray-soft" />
                    </div>
                    <p className="text-xs text-phm-gray-soft">No hay eventos este día</p>
                    <button onClick={() => openNewForm(selectedDate)} className="mt-3 text-xs text-phm-gold hover:underline transition-colors">
                      + Crear evento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map(ev => (
                      <button key={ev.id} onClick={() => setSelectedEventDetail(ev)}
                        className="w-full text-left p-3 rounded-lg hover:bg-phm-surface/60 transition-all group"
                        style={{ borderLeft: `3px solid ${TYPE_COLORS[ev.type]}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-phm-gold transition-colors">{ev.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: TYPE_COLORS[ev.type] }}>
                              {formatTime(ev.startDateTime)} – {formatTime(ev.endDateTime)}
                              {ev.type !== 'OTRO' && ` · ${TYPE_LABELS[ev.type]}`}
                            </p>
                            {ev.clientName && <p className="text-xs text-phm-gray-soft mt-0.5">{ev.clientName}</p>}
                          </div>
                          <span className={`flex-shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_BADGE[ev.status] || STATUS_BADGE.AGENDADO}`}>
                            {STATUS_LABELS[ev.status] || ev.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PremiumCard>

          ) : (
            // ── Empty state con próximos ───────────────────────
            <PremiumCard padding="md">
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-phm-surface border border-phm-border-soft flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-5 h-5 text-phm-gray-soft opacity-60" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Vista de eventos</p>
                <p className="text-xs text-phm-gray-soft leading-relaxed">Selecciona un día del calendario para ver o agregar eventos</p>
              </div>

              {upcomingEvents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-phm-border-soft">
                  <p className="text-[10px] font-bold text-phm-gray-soft uppercase tracking-widest mb-3">Próximos eventos</p>
                  <div className="space-y-1.5">
                    {upcomingEvents.slice(0, 6).map(ev => (
                      <button key={ev.id}
                        onClick={() => { setSelectedEventDetail(ev); setSelectedDate(toLocalDateStr(new Date(ev.startDateTime))) }}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-phm-surface transition-all pl-3"
                        style={{ borderLeft: `2px solid ${TYPE_COLORS[ev.type]}` }}>
                        <p className="text-xs font-semibold text-white truncate">{ev.title}</p>
                        <p className="text-[10px] text-phm-gray-soft mt-0.5">
                          {new Date(ev.startDateTime).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(ev.startDateTime)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </PremiumCard>
          )}
        </div>
      </div>

      {/* ── Modal formulario ────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full max-w-lg bg-phm-charcoal rounded-2xl border border-phm-border-soft shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-phm-border-soft flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{editingEvent ? 'Editar evento' : 'Nuevo evento'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-phm-surface rounded-lg text-phm-gray hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[68vh] overflow-y-auto">
              <div>
                <label className={labelCls}>Título *</label>
                <input type="text" value={form.title} onChange={e => handleFormChange('title', e.target.value)} placeholder="Nombre del evento" className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className={labelCls}>Fecha *</label>
                  <input type="date" value={form.startDate} onChange={e => handleFormChange('startDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Inicio *</label>
                  <input type="time" value={form.startTime} onChange={e => handleFormChange('startTime', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fin *</label>
                  <input type="time" value={form.endTime} onChange={e => handleFormChange('endTime', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tipo</label>
                  <select value={form.type} onChange={e => handleFormChange('type', e.target.value)} className={selectCls}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => handleFormChange('status', e.target.value)} className={selectCls}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Cliente (opcional)</label>
                <select value={form.clientId} onChange={e => handleFormChange('clientId', e.target.value)} className={selectCls}>
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ubicación (opcional)</label>
                <input type="text" value={form.location} onChange={e => handleFormChange('location', e.target.value)} placeholder="Lugar del evento" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notas (opcional)</label>
                <textarea value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} placeholder="Notas adicionales..." rows={3} className={`${inputCls} resize-none`} />
              </div>
              {formError && <p className="text-sm text-red-300 bg-red-950/50 border border-red-900/60 rounded-lg px-3 py-2">{formError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-phm-border-soft flex items-center justify-between gap-3">
              {editingEvent && (
                <button onClick={() => { setShowForm(false); setDeleteId(editingEvent.id) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-phm-gray-soft hover:text-red-400 hover:bg-phm-surface transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={closeForm} className="px-4 py-2 rounded-lg text-sm font-medium text-phm-gray hover:text-white hover:bg-phm-surface transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando...' : editingEvent ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ─────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-phm-charcoal rounded-2xl border border-phm-border-soft shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/60 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Eliminar evento</h4>
                <p className="text-xs text-phm-gray-soft mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-phm-gray hover:text-white hover:bg-phm-surface transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover disabled:opacity-50 transition-colors">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
