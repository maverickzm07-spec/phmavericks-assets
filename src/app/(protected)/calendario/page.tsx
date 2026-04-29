'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Tipos ─────────────────────────────────────────────────────

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
  SESION_FOTOGRAFICA: '#7c3aed',
  REUNION: '#2563eb',
  ENTREGA: '#d97706',
  EDICION: '#059669',
  EVENTO: '#db2777',
  OTRO: '#6b7280',
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// ── Helpers ───────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function eventStartHour(ev: CalEvent): number {
  return new Date(ev.startDateTime).getHours()
}

// ── Componente principal ──────────────────────────────────────

export default function CalendarioPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)

  // Vista día
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayEvents, setDayEvents] = useState<CalEvent[]>([])
  const [dayLoading, setDayLoading] = useState(false)

  // Formulario
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Confirmación eliminación
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Google Calendar
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const googleChecked = useRef(false)

  useEffect(() => {
    if (googleChecked.current) return
    googleChecked.current = true

    // Detectar parámetro ?google=... tras el OAuth redirect
    const params = new URLSearchParams(window.location.search)
    const g = params.get('google')
    if (g === 'connected') {
      setSyncMsg('Google Calendar conectado correctamente')
      setGoogleConnected(true)
      window.history.replaceState({}, '', '/calendario')
    } else if (g === 'error') {
      setSyncMsg('Error al conectar con Google Calendar')
      window.history.replaceState({}, '', '/calendario')
    } else if (g === 'no-config') {
      setSyncMsg('Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor')
      window.history.replaceState({}, '', '/calendario')
    }

    fetch('/api/calendario/google-status')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setGoogleConnected(d.connected)
          setGoogleConfigured(d.configured)
        }
      })
      .catch(() => {})
  }, [])

  const handleGoogleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/calendario/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncMsg(data.error || 'Error al sincronizar')
      } else {
        const parts: string[] = []
        if (data.phmToGoogle > 0) parts.push(`${data.phmToGoogle} enviado${data.phmToGoogle !== 1 ? 's' : ''} a Google`)
        if (data.googleToPHM > 0) parts.push(`${data.googleToPHM} importado${data.googleToPHM !== 1 ? 's' : ''} de Google`)
        if (data.cancelled > 0) parts.push(`${data.cancelled} cancelado${data.cancelled !== 1 ? 's' : ''}`)
        if (data.readOnly > 0) parts.push(`${data.readOnly} evento${data.readOnly !== 1 ? 's' : ''} externo${data.readOnly !== 1 ? 's' : ''} (solo lectura)`)

        let msg = parts.length > 0 ? `Sincronizado: ${parts.join(' · ')}` : 'Todo sincronizado'

        if (data.errors > 0 && data.errorDetails?.length > 0) {
          msg += ` · ${data.errors} error${data.errors !== 1 ? 'es' : ''}: ${data.errorDetails.slice(0, 2).join(' | ')}`
        } else if (data.errors > 0) {
          msg += ` · ${data.errors} error${data.errors !== 1 ? 'es' : ''}`
        }

        setSyncMsg(msg)
        fetchMonthEvents()
      }
    } catch {
      setSyncMsg('Error de conexión')
    } finally {
      setSyncing(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    await fetch('/api/auth/google/disconnect', { method: 'POST' })
    setGoogleConnected(false)
    setSyncMsg('Google Calendar desconectado')
  }

  // ── Fetch eventos del mes ──────────────────────────────────

  const fetchMonthEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/calendario?year=${currentYear}&month=${currentMonth}`)
      if (res.ok) setEvents(await res.json())
    } finally {
      setLoading(false)
    }
  }, [currentYear, currentMonth])

  useEffect(() => { fetchMonthEvents() }, [fetchMonthEvents])

  // ── Fetch clientes para el dropdown ───────────────────────

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // ── Fetch eventos del día seleccionado ────────────────────

  const openDay = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setDayLoading(true)
    try {
      const res = await fetch(`/api/calendario?date=${dateStr}`)
      if (res.ok) setDayEvents(await res.json())
    } finally {
      setDayLoading(false)
    }
  }

  const closeDay = () => {
    setSelectedDate(null)
    setDayEvents([])
  }

  // ── Navegación de mes ──────────────────────────────────────

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const goToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth() + 1)
  }

  // ── Grid del mes ───────────────────────────────────────────

  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate()

  const cells: { day: number; month: 'prev' | 'current' | 'next'; dateStr: string }[] = []

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = currentMonth === 1 ? 12 : currentMonth - 1
    const y = currentMonth === 1 ? currentYear - 1 : currentYear
    cells.push({ day: d, month: 'prev', dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: 'current', dateStr: `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }

  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 12 ? 1 : currentMonth + 1
    const y = currentMonth === 12 ? currentYear + 1 : currentYear
    cells.push({ day: d, month: 'next', dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }

  const todayStr = toLocalDateStr(today)

  const eventsPerDay: Record<string, CalEvent[]> = {}
  events.forEach(ev => {
    const d = toLocalDateStr(new Date(ev.startDateTime))
    if (!eventsPerDay[d]) eventsPerDay[d] = []
    eventsPerDay[d].push(ev)
  })

  // ── Formulario de evento ────────────────────────────────────

  const openNewForm = (dateStr?: string, hour?: number) => {
    setEditingEvent(null)
    const h = hour !== undefined ? String(hour).padStart(2, '0') : '09'
    const h2 = hour !== undefined ? String(hour + 1).padStart(2, '0') : '10'
    setForm({
      ...EMPTY_FORM,
      startDate: dateStr || todayStr,
      startTime: `${h}:00`,
      endTime: `${h2}:00`,
    })
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = (ev: CalEvent) => {
    const start = new Date(ev.startDateTime)
    const end = new Date(ev.endDateTime)
    setEditingEvent(ev)
    setForm({
      title: ev.title,
      type: ev.type,
      startDate: toLocalDateStr(start),
      startTime: `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`,
      endTime: `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`,
      location: ev.location || '',
      notes: ev.notes || '',
      clientId: ev.clientId || '',
      clientName: ev.clientName || '',
      status: ev.status,
    })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingEvent(null)
    setFormError('')
  }

  const handleFormChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'clientId') {
      const c = clients.find(c => c.id === value)
      setForm(f => ({ ...f, clientId: value, clientName: c ? c.name : '' }))
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('El título es obligatorio'); return }
    if (!form.startDate) { setFormError('La fecha es obligatoria'); return }
    if (!form.startTime) { setFormError('La hora de inicio es obligatoria'); return }
    if (!form.endTime) { setFormError('La hora de fin es obligatoria'); return }
    if (form.endTime <= form.startTime) { setFormError('La hora de fin debe ser mayor a la de inicio'); return }

    setSaving(true)
    setFormError('')
    try {
      const startDateTime = `${form.startDate}T${form.startTime}:00`
      const endDateTime = `${form.startDate}T${form.endTime}:00`

      const payload = {
        title: form.title.trim(),
        type: form.type,
        startDateTime,
        endDateTime,
        location: form.location || null,
        notes: form.notes || null,
        clientId: form.clientId || null,
        clientName: form.clientName || null,
        status: form.status,
      }

      const url = editingEvent ? `/api/calendario/${editingEvent.id}` : '/api/calendario'
      const method = editingEvent ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error || 'Error al guardar')
        return
      }

      closeForm()
      fetchMonthEvents()
      if (selectedDate) openDay(selectedDate)
    } catch {
      setFormError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar evento ────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await fetch(`/api/calendario/${id}`, { method: 'DELETE' })
      setDeleteId(null)
      fetchMonthEvents()
      if (selectedDate) openDay(selectedDate)
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="px-4 sm:px-6 py-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Calendario</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Organiza grabaciones, sesiones, reuniones y más</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewForm()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#8B0000' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo evento
          </button>
          {googleConnected ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 border border-zinc-600 hover:border-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button
                onClick={handleGoogleDisconnect}
                className="px-2 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                title="Desconectar Google Calendar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <a
              href={googleConfigured ? '/api/auth/google' : undefined}
              onClick={!googleConfigured ? () => setSyncMsg('Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor') : undefined}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Conectar Google Calendar
            </a>
          )}
        </div>
      </div>

      {/* Mensaje de estado Google */}
      {syncMsg && (
        <div className={`mx-4 sm:mx-6 mt-2 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between gap-3 ${syncMsg.includes('Error') || syncMsg.includes('error') || syncMsg.includes('Configura') ? 'bg-red-950/60 border border-red-900 text-red-300' : 'bg-zinc-800 border border-zinc-700 text-zinc-300'}`}>
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg('')} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Navegación del mes */}
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-zinc-50 min-w-[180px] text-center">
            {MONTHS[currentMonth - 1]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors">
          Hoy
        </button>
      </div>

      {/* Grid del calendario */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Encabezado días */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-zinc-500 py-2">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">Cargando...</div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-xl overflow-hidden">
            {cells.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr
              const isSelected = cell.dateStr === selectedDate
              const cellEvents = eventsPerDay[cell.dateStr] || []
              const isCurrent = cell.month === 'current'

              return (
                <button
                  key={idx}
                  onClick={() => openDay(cell.dateStr)}
                  className={`relative bg-zinc-950 hover:bg-zinc-900 transition-colors min-h-[72px] sm:min-h-[90px] p-1.5 text-left flex flex-col ${!isCurrent ? 'opacity-30' : ''}`}
                >
                  {/* Número del día */}
                  <span
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                      isToday
                        ? 'text-white'
                        : isSelected
                        ? 'text-white border-2 border-red-700'
                        : 'text-zinc-300'
                    }`}
                    style={isToday ? { backgroundColor: '#8B0000' } : {}}
                  >
                    {cell.day}
                  </span>

                  {/* Indicadores de eventos */}
                  {cellEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-auto">
                      {cellEvents.slice(0, 3).map(ev => (
                        <span
                          key={ev.id}
                          className="block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: TYPE_COLORS[ev.type] || '#d4af37' }}
                          title={ev.title}
                        />
                      ))}
                      {cellEvents.length > 3 && (
                        <span className="text-[9px] text-zinc-500 leading-none mt-0.5">+{cellEvents.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Títulos de eventos (solo escritorio) */}
                  <div className="hidden sm:flex flex-col gap-0.5 w-full">
                    {cellEvents.slice(0, 2).map(ev => (
                      <span
                        key={ev.id}
                        className="text-[10px] leading-tight px-1 py-0.5 rounded truncate w-full"
                        style={{ backgroundColor: TYPE_COLORS[ev.type] + '33', color: TYPE_COLORS[ev.type] }}
                      >
                        {formatTime(ev.startDateTime)} {ev.title}
                      </span>
                    ))}
                    {cellEvents.length > 2 && (
                      <span className="text-[10px] text-zinc-500 px-1">+{cellEvents.length - 2} más</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal vista de día ─────────────────────────────────── */}
      {selectedDate && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDay} />

          {/* Panel lateral */}
          <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto flex flex-col shadow-2xl">
            {/* Header del día */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Vista del día</p>
                <h3 className="text-base font-semibold text-zinc-50 capitalize">
                  {selectedDate && formatDateLabel(selectedDate + 'T12:00:00')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openNewForm(selectedDate)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                  style={{ backgroundColor: '#8B0000' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
                <button onClick={closeDay} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Timeline 24h */}
            {dayLoading ? (
              <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">Cargando...</div>
            ) : (
              <div className="flex-1 px-4 py-2">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourEvents = dayEvents.filter(ev => eventStartHour(ev) === hour)
                  const label = `${String(hour).padStart(2, '0')}:00`

                  return (
                    <div key={hour} className="flex gap-3 group">
                      {/* Hora */}
                      <div className="w-12 flex-shrink-0 pt-2">
                        <span className="text-xs text-zinc-600 select-none">{label}</span>
                      </div>

                      {/* Área de eventos */}
                      <div className="flex-1 border-t border-zinc-800 min-h-[56px] py-1.5 relative">
                        {/* Botón agregar al hover */}
                        <button
                          onClick={() => openNewForm(selectedDate, hour)}
                          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>

                        {/* Eventos de esta hora */}
                        {hourEvents.map(ev => (
                          <div
                            key={ev.id}
                            className="mb-1 rounded-lg px-2.5 py-1.5 cursor-pointer hover:brightness-110 transition-all"
                            style={{ backgroundColor: TYPE_COLORS[ev.type] + '22', borderLeft: `3px solid ${TYPE_COLORS[ev.type]}` }}
                            onClick={() => openEditForm(ev)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-100 truncate">{ev.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: TYPE_COLORS[ev.type] }}>
                                  {formatTime(ev.startDateTime)} – {formatTime(ev.endDateTime)}
                                  {ev.type !== 'OTRO' && ` · ${TYPE_LABELS[ev.type]}`}
                                </p>
                                {ev.clientName && (
                                  <p className="text-xs text-zinc-500 mt-0.5">Cliente: {ev.clientName}</p>
                                )}
                                {ev.location && (
                                  <p className="text-xs text-zinc-500 mt-0.5">📍 {ev.location}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteId(ev.id) }}
                                className="flex-shrink-0 p-1 rounded hover:bg-zinc-700 text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal formulario de evento ─────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-50">
                {editingEvent ? 'Editar evento' : 'Nuevo evento'}
              </h3>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleFormChange('title', e.target.value)}
                  placeholder="Nombre del evento"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700 transition-colors"
                />
              </div>

              {/* Fecha + Horas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => handleFormChange('startDate', e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-red-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Inicio *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => handleFormChange('startTime', e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-red-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fin *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => handleFormChange('endTime', e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-red-700 transition-colors"
                  />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => handleFormChange('type', e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-red-700 transition-colors"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cliente (opcional)</label>
                <select
                  value={form.clientId}
                  onChange={e => handleFormChange('clientId', e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-red-700 transition-colors"
                >
                  <option value="">Sin cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.business}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Estado</label>
                <select
                  value={form.status}
                  onChange={e => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-red-700 transition-colors"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ubicación (opcional)</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => handleFormChange('location', e.target.value)}
                  placeholder="Lugar del evento"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700 transition-colors"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-700 transition-colors resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{formError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              {editingEvent && (
                <button
                  onClick={() => { setShowForm(false); setDeleteId(editingEvent.id) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#8B0000' }}
                >
                  {saving ? 'Guardando...' : editingEvent ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación eliminar ───────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-950 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-50">Eliminar evento</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
