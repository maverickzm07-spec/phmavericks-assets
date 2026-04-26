'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type TipoServicio = 'FOTOGRAFIA' | 'REELS' | 'VIDEOS_HORIZONTALES' | 'IMAGENES_FLYERS' | 'PLAN_MENSUAL' | 'PERSONALIZADO'
type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'PARCIAL'
type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA' | 'OTRO'

interface Abono {
  id: string
  monto: number
  metodoPago: MetodoPago | null
  fechaAbono: string
  observacion: string | null
  creadoPorUser: { name: string }
}

interface Ingreso {
  id: string
  clienteId: string | null
  cliente: { id: string; name: string; business: string } | null
  tipoServicio: TipoServicio
  descripcion: string | null
  monto: number
  montoPagado: number
  saldoPendiente: number
  porcentajePagado: number
  estadoPago: EstadoPago
  metodoPago: MetodoPago | null
  fechaIngreso: string
  observaciones: string | null
  creadoPorUser: { name: string }
  abonos?: Abono[]
  _count?: { abonos: number }
}

interface Totales {
  hoy: number; semana: number; mes: number; anio: number; total: number
  pendiente: number; pagosCompletos: number; pagosParcialesCount: number; clientesConDeuda: number
}

interface Client { id: string; name: string; business: string }

const TIPO_LABEL: Record<TipoServicio, string> = {
  FOTOGRAFIA: 'Fotografía', REELS: 'Reels', VIDEOS_HORIZONTALES: 'Videos horiz.',
  IMAGENES_FLYERS: 'Imágenes/Flyers', PLAN_MENSUAL: 'Plan mensual', PERSONALIZADO: 'Personalizado',
}
const TIPO_LABEL_FULL: Record<TipoServicio, string> = {
  FOTOGRAFIA: 'Fotografía', REELS: 'Reels / Videos verticales', VIDEOS_HORIZONTALES: 'Videos horizontales',
  IMAGENES_FLYERS: 'Imágenes o flyers', PLAN_MENSUAL: 'Plan mensual', PERSONALIZADO: 'Personalizado',
}
const TIPO_COLOR: Record<TipoServicio, string> = {
  FOTOGRAFIA: 'bg-amber-950 text-amber-300 border-amber-800',
  REELS: 'bg-purple-950 text-purple-300 border-purple-800',
  VIDEOS_HORIZONTALES: 'bg-green-950 text-green-300 border-green-800',
  IMAGENES_FLYERS: 'bg-pink-950 text-pink-300 border-pink-800',
  PLAN_MENSUAL: 'bg-blue-950 text-blue-300 border-blue-800',
  PERSONALIZADO: 'bg-zinc-800 text-zinc-300 border-zinc-700',
}
const ESTADO_COLOR: Record<EstadoPago, string> = {
  PAGADO: 'bg-green-950 text-green-400 border-green-800',
  PENDIENTE: 'bg-red-950 text-red-400 border-red-900',
  PARCIAL: 'bg-orange-950 text-orange-400 border-orange-900',
}
const ESTADO_LABEL: Record<EstadoPago, string> = { PAGADO: 'Pagado', PENDIENTE: 'Pendiente', PARCIAL: 'Parcial' }
const METODO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', DEPOSITO: 'Depósito', TARJETA: 'Tarjeta', OTRO: 'Otro',
}

const fmt = (n: number) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const EMPTY_FORM = {
  clienteId: '', tipoServicio: 'PLAN_MENSUAL' as TipoServicio, descripcion: '',
  monto: '', montoPagado: '0', metodoPago: '' as MetodoPago | '',
  fechaIngreso: new Date().toISOString().split('T')[0], observaciones: '',
}

function calcAuto(monto: string, pagado: string) {
  const m = parseFloat(monto) || 0
  const p = Math.min(parseFloat(pagado) || 0, m)
  const saldo = Math.max(0, m - p)
  const pct = m > 0 ? Math.min(100, Math.round((p / m) * 100)) : 0
  const estado: EstadoPago = p <= 0 ? 'PENDIENTE' : p >= m ? 'PAGADO' : 'PARCIAL'
  return { saldo, pct, estado }
}

export default function IngresosPage() {
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get('clienteId') || ''
  const createParam = searchParams.get('create') === '1'

  const [data, setData] = useState<{ ingresos: Ingreso[]; totales: Totales; totalFiltrado: number; pendienteFiltrado: number } | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroCliente, setFiltroCliente] = useState(clienteIdParam)

  const [showForm, setShowForm] = useState(false)
  const [editingIngreso, setEditingIngreso] = useState<Ingreso | null>(null)
  const [showAbono, setShowAbono] = useState<Ingreso | null>(null)
  const [showDetalle, setShowDetalle] = useState<Ingreso | null>(null)
  const [showDelete, setShowDelete] = useState<Ingreso | null>(null)

  const [form, setForm] = useState({ ...EMPTY_FORM, clienteId: clienteIdParam })
  const [abonoForm, setAbonoForm] = useState({ monto: '', metodoPago: '' as MetodoPago | '', fechaAbono: new Date().toISOString().split('T')[0], observacion: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [detalleData, setDetalleData] = useState<Ingreso | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && ['SUPER_ADMIN', 'ADMIN'].includes(d.role)) {
          setAuthorized(true)
          setIsSuperAdmin(d.role === 'SUPER_ADMIN')
        } else setAuthorized(false)
      })
      .catch(() => setAuthorized(false))
  }, [])

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroTipo) params.set('tipo', filtroTipo)
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroCliente) params.set('clienteId', filtroCliente)
    if (filtroPeriodo) params.set('periodo', filtroPeriodo)
    if (filtroPeriodo === 'rango') {
      if (filtroDesde) params.set('desde', filtroDesde)
      if (filtroHasta) params.set('hasta', filtroHasta)
    }
    const res = await fetch(`/api/ingresos?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [filtroTipo, filtroEstado, filtroCliente, filtroPeriodo, filtroDesde, filtroHasta])

  useEffect(() => { if (authorized) fetchData() }, [authorized, fetchData])

  useEffect(() => {
    if (authorized && createParam) {
      setForm({ ...EMPTY_FORM, clienteId: clienteIdParam })
      setEditingIngreso(null)
      setFormError('')
      setShowForm(true)
    }
  }, [authorized])

  const openCreate = () => {
    setEditingIngreso(null)
    setForm({ ...EMPTY_FORM, clienteId: filtroCliente })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (ingreso: Ingreso) => {
    setEditingIngreso(ingreso)
    setForm({
      clienteId: ingreso.clienteId || '',
      tipoServicio: ingreso.tipoServicio,
      descripcion: ingreso.descripcion || '',
      monto: ingreso.monto.toString(),
      montoPagado: ingreso.montoPagado.toString(),
      metodoPago: ingreso.metodoPago || '',
      fechaIngreso: new Date(ingreso.fechaIngreso).toISOString().split('T')[0],
      observaciones: ingreso.observaciones || '',
    })
    setFormError('')
    setShowForm(true)
  }

  const openDetalle = async (ingreso: Ingreso) => {
    setShowDetalle(ingreso)
    setDetalleData(null)
    const res = await fetch(`/api/ingresos/${ingreso.id}`)
    if (res.ok) setDetalleData(await res.json())
  }

  const openAbono = (ingreso: Ingreso) => {
    setShowAbono(ingreso)
    setAbonoForm({ monto: '', metodoPago: '', fechaAbono: new Date().toISOString().split('T')[0], observacion: '' })
    setFormError('')
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = parseFloat(form.monto)
    if (isNaN(monto) || monto <= 0) { setFormError('El valor total debe ser mayor a 0'); return }
    const montoPagado = Math.min(parseFloat(form.montoPagado) || 0, monto)
    setFormLoading(true); setFormError('')
    const payload = {
      clienteId: form.clienteId || null,
      tipoServicio: form.tipoServicio,
      descripcion: form.descripcion.trim() || undefined,
      monto,
      montoPagado,
      metodoPago: form.metodoPago || null,
      fechaIngreso: form.fechaIngreso,
      observaciones: form.observaciones.trim() || undefined,
    }
    try {
      const url = editingIngreso ? `/api/ingresos/${editingIngreso.id}` : '/api/ingresos'
      const method = editingIngreso ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { setShowForm(false); fetchData() }
      else { const d = await res.json(); setFormError(d.error || 'Error al guardar') }
    } catch { setFormError('Error de conexión') }
    finally { setFormLoading(false) }
  }

  const handleAbono = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAbono) return
    const monto = parseFloat(abonoForm.monto)
    if (isNaN(monto) || monto <= 0) { setFormError('El abono debe ser mayor a 0'); return }
    setFormLoading(true); setFormError('')
    try {
      const res = await fetch(`/api/ingresos/${showAbono.id}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, metodoPago: abonoForm.metodoPago || null, fechaAbono: abonoForm.fechaAbono, observacion: abonoForm.observacion || undefined }),
      })
      if (res.ok) { setShowAbono(null); fetchData() }
      else { const d = await res.json(); setFormError(d.error || 'Error al registrar abono') }
    } catch { setFormError('Error de conexión') }
    finally { setFormLoading(false) }
  }

  const handleEstado = async (ingreso: Ingreso, estadoPago: EstadoPago) => {
    await fetch(`/api/ingresos/${ingreso.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estadoPago }),
    })
    fetchData()
  }

  const handleDelete = async () => {
    if (!showDelete) return
    setDeleting(true)
    const res = await fetch(`/api/ingresos/${showDelete.id}`, { method: 'DELETE' })
    if (res.ok) { setShowDelete(null); fetchData() }
    setDeleting(false)
  }

  if (authorized === null) return <div className="text-zinc-500 text-sm py-10 text-center">Verificando acceso...</div>
  if (!authorized) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-950 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-zinc-100 mb-2">Sin permisos</h2>
      <p className="text-zinc-500 text-sm mb-6">Solo administradores pueden acceder al módulo de Ingresos.</p>
      <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#8B0000' }}>Volver al dashboard</Link>
    </div>
  )

  const totales = data?.totales
  const ingresos = data?.ingresos || []
  const { saldo: formSaldo, pct: formPct, estado: formEstado } = calcAuto(form.monto, form.montoPagado)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Ingresos</h1>
          <p className="text-zinc-500 text-sm">{ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#8B0000' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span className="hidden sm:inline">Nuevo ingreso</span>
        </button>
      </div>

      {/* Cards 3x3 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Hoy', value: totales?.hoy || 0, color: '#8B0000', money: true },
          { label: 'Esta semana', value: totales?.semana || 0, color: '#1d4ed8', money: true },
          { label: 'Este mes', value: totales?.mes || 0, color: '#15803d', money: true },
          { label: 'Este año', value: totales?.anio || 0, color: '#7c3aed', money: true },
          { label: 'Total general cobrado', value: totales?.total || 0, color: '#b45309', money: true },
          { label: 'Pendiente por cobrar', value: totales?.pendiente || 0, color: '#dc2626', money: true, red: true },
          { label: 'Pagos completos', value: totales?.pagosCompletos || 0, color: '#15803d', money: false },
          { label: 'Pagos parciales', value: totales?.pagosParcialesCount || 0, color: '#d97706', money: false },
          { label: 'Clientes con deuda', value: totales?.clientesConDeuda || 0, color: '#dc2626', money: false },
        ].map(card => (
          <div key={card.label} className={`bg-zinc-900 border rounded-xl p-4 ${card.red ? 'border-red-900/50' : 'border-zinc-800'}`}>
            <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.red ? 'text-red-400' : 'text-white'}`}>
              {card.money ? fmt(card.value as number) : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        {/* Tipo */}
        <div className="flex gap-1 flex-wrap">
          {[{ key: '', label: 'Todos' }, { key: 'FOTOGRAFIA', label: 'Fotografía' }, { key: 'REELS', label: 'Reels' },
            { key: 'VIDEOS_HORIZONTALES', label: 'Videos horiz.' }, { key: 'IMAGENES_FLYERS', label: 'Imágenes/Flyers' },
            { key: 'PLAN_MENSUAL', label: 'Plan mensual' }, { key: 'PERSONALIZADO', label: 'Personalizado' }
          ].map(t => (
            <button key={t.key} onClick={() => setFiltroTipo(t.key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filtroTipo === t.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Estado */}
          <div className="flex gap-1">
            {[{ key: '', label: 'Todo estado' }, { key: 'PAGADO', label: 'Pagado' }, { key: 'PARCIAL', label: 'Parcial' }, { key: 'PENDIENTE', label: 'Pendiente' }].map(s => (
              <button key={s.key} onClick={() => setFiltroEstado(s.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filtroEstado === s.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Periodo */}
          <div className="flex gap-1">
            {[{ key: 'hoy', label: 'Hoy' }, { key: 'semana', label: 'Semana' }, { key: 'mes', label: 'Mes' },
              { key: 'anio', label: 'Año' }, { key: '', label: 'Todo' }, { key: 'rango', label: 'Rango' }
            ].map(p => (
              <button key={p.key} onClick={() => setFiltroPeriodo(p.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filtroPeriodo === p.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {filtroPeriodo === 'rango' && (
            <div className="flex gap-2 items-center">
              <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
                className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 focus:outline-none focus:border-zinc-500" />
              <span className="text-zinc-600 text-xs">—</span>
              <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
                className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 focus:outline-none focus:border-zinc-500" />
            </div>
          )}

          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
            className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 focus:outline-none focus:border-zinc-500 ml-auto">
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
          </select>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">{ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-4 text-xs">
            <span className="text-zinc-500">Cobrado: <span className="text-green-400 font-medium">{fmt(data?.totalFiltrado || 0)}</span></span>
            <span className="text-zinc-500">Pendiente: <span className="text-red-400 font-medium">{fmt(data?.pendienteFiltrado || 0)}</span></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : ingresos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-zinc-400 font-medium mb-1">No hay ingresos</p>
            <p className="text-zinc-600 text-sm mb-4">Registra el primer ingreso.</p>
            <button onClick={openCreate} className="text-sm font-medium text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#8B0000' }}>Nuevo ingreso</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Fecha', 'Cliente', 'Tipo', 'Descripción', 'Valor total', 'Abonado', 'Saldo', '%', 'Estado', 'Método', 'Acciones'].map(h => (
                    <th key={h} className={`text-${h === 'Acciones' ? 'right' : 'left'} text-xs font-medium text-zinc-500 px-4 py-3 whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {ingresos.map(ingreso => (
                  <tr key={ingreso.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{fmtDate(ingreso.fechaIngreso)}</td>
                    <td className="px-4 py-3">
                      {ingreso.cliente
                        ? <div><p className="text-sm font-medium text-zinc-200 whitespace-nowrap">{ingreso.cliente.name}</p><p className="text-xs text-zinc-500">{ingreso.cliente.business}</p></div>
                        : <span className="text-xs text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${TIPO_COLOR[ingreso.tipoServicio]}`}>
                        {TIPO_LABEL[ingreso.tipoServicio]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[140px] truncate">{ingreso.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-zinc-200 whitespace-nowrap">{fmt(ingreso.monto)}</td>
                    <td className="px-4 py-3 text-sm text-green-400 whitespace-nowrap">{fmt(ingreso.montoPagado)}</td>
                    <td className="px-4 py-3 text-sm text-red-400 whitespace-nowrap">{fmt(ingreso.saldoPendiente)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 min-w-[60px]">
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${ingreso.porcentajePagado}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400">{ingreso.porcentajePagado}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${ESTADO_COLOR[ingreso.estadoPago]}`}>
                        {ESTADO_LABEL[ingreso.estadoPago]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{ingreso.metodoPago ? METODO_LABEL[ingreso.metodoPago] : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end flex-wrap min-w-[200px]">
                        <button onClick={() => openDetalle(ingreso)} className="px-2 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-all">Ver</button>
                        <button onClick={() => openEdit(ingreso)} className="px-2 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-all">Editar</button>
                        {ingreso.estadoPago !== 'PAGADO' && (
                          <button onClick={() => openAbono(ingreso)} className="px-2 py-1 text-xs font-medium text-blue-400 bg-blue-950/50 hover:bg-blue-950 rounded transition-all">+ Abono</button>
                        )}
                        {ingreso.estadoPago !== 'PAGADO' && (
                          <button onClick={() => handleEstado(ingreso, 'PAGADO')} className="px-2 py-1 text-xs font-medium text-green-400 bg-green-950/50 hover:bg-green-950 rounded transition-all">✓ Pagado</button>
                        )}
                        {ingreso.estadoPago !== 'PENDIENTE' && (
                          <button onClick={() => handleEstado(ingreso, 'PENDIENTE')} className="px-2 py-1 text-xs font-medium text-yellow-400 bg-yellow-950/50 hover:bg-yellow-950 rounded transition-all">Pendiente</button>
                        )}
                        {isSuperAdmin && (
                          <button onClick={() => setShowDelete(ingreso)} className="px-2 py-1 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded transition-all">Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL CREAR/EDITAR ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="font-semibold text-zinc-100">{editingIngreso ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cliente *</label>
                  <select name="clienteId" value={form.clienteId} onChange={handleFormChange} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="">Selecciona un cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo de servicio *</label>
                  <select name="tipoServicio" value={form.tipoServicio} onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    {Object.entries(TIPO_LABEL_FULL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha *</label>
                  <input name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={handleFormChange} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descripción</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleFormChange}
                    placeholder="Ej: Sesión fotográfica abril 2026"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Valor total del servicio ($) *</label>
                  <input name="monto" type="number" min="0.01" step="0.01" value={form.monto} onChange={handleFormChange} required
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Abono recibido ($)</label>
                  <input name="montoPagado" type="number" min="0" step="0.01" value={form.montoPagado} onChange={handleFormChange}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                {/* Auto-cálculo */}
                {form.monto && (
                  <div className="col-span-2 grid grid-cols-3 gap-3 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-0.5">Saldo pendiente</p>
                      <p className="text-sm font-bold text-red-400">{fmt(formSaldo)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-0.5">% pagado</p>
                      <p className="text-sm font-bold text-zinc-200">{formPct}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-0.5">Estado</p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_COLOR[formEstado]}`}>
                        {ESTADO_LABEL[formEstado]}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Método de pago *</label>
                  <select name="metodoPago" value={form.metodoPago} onChange={handleFormChange} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="">Selecciona...</option>
                    {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Observaciones</label>
                  <textarea name="observaciones" value={form.observaciones} onChange={handleFormChange} rows={2}
                    placeholder="Notas adicionales..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
                </div>
              </div>

              {formError && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#8B0000' }}>
                  {formLoading ? 'Guardando...' : editingIngreso ? 'Guardar cambios' : 'Registrar ingreso'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR ABONO ── */}
      {showAbono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAbono(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-zinc-100">Agregar abono</h2>
              <button onClick={() => setShowAbono(null)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAbono} className="p-5 space-y-4">
              {/* Resumen del ingreso */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700 text-center">
                <div><p className="text-xs text-zinc-500 mb-0.5">Valor total</p><p className="text-sm font-bold text-zinc-200">{fmt(showAbono.monto)}</p></div>
                <div><p className="text-xs text-zinc-500 mb-0.5">Total abonado</p><p className="text-sm font-bold text-green-400">{fmt(showAbono.montoPagado)}</p></div>
                <div><p className="text-xs text-zinc-500 mb-0.5">Saldo pendiente</p><p className="text-sm font-bold text-red-400">{fmt(showAbono.saldoPendiente)}</p></div>
              </div>
              {showAbono.cliente && (
                <p className="text-xs text-zinc-500">Cliente: <span className="text-zinc-300">{showAbono.cliente.name}</span> · {showAbono.descripcion || TIPO_LABEL_FULL[showAbono.tipoServicio]}</p>
              )}

              {/* Auto-cálculo del abono */}
              {abonoForm.monto && (() => {
                const nuevoAbono = parseFloat(abonoForm.monto) || 0
                const nuevoTotal = Math.min(showAbono.monto, showAbono.montoPagado + nuevoAbono)
                const nuevoSaldo = Math.max(0, showAbono.monto - nuevoTotal)
                const nuevoEstado = calcAuto(showAbono.monto.toString(), nuevoTotal.toString()).estado
                return (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-700/50 text-center">
                    <div><p className="text-xs text-zinc-500 mb-0.5">Nuevo total abonado</p><p className="text-sm font-bold text-green-400">{fmt(nuevoTotal)}</p></div>
                    <div><p className="text-xs text-zinc-500 mb-0.5">Nuevo saldo</p><p className="text-sm font-bold text-red-400">{fmt(nuevoSaldo)}</p></div>
                    <div><p className="text-xs text-zinc-500 mb-0.5">Nuevo estado</p><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_COLOR[nuevoEstado]}`}>{ESTADO_LABEL[nuevoEstado]}</span></div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nuevo abono ($) *</label>
                  <input type="number" min="0.01" step="0.01" value={abonoForm.monto}
                    onChange={e => setAbonoForm(p => ({ ...p, monto: e.target.value }))} required
                    placeholder={`Máx. ${fmt(showAbono.saldoPendiente)}`}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha del abono *</label>
                  <input type="date" value={abonoForm.fechaAbono}
                    onChange={e => setAbonoForm(p => ({ ...p, fechaAbono: e.target.value }))} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Método de pago *</label>
                  <select value={abonoForm.metodoPago} onChange={e => setAbonoForm(p => ({ ...p, metodoPago: e.target.value as MetodoPago | '' }))} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="">Selecciona...</option>
                    {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Observación</label>
                  <input value={abonoForm.observacion} onChange={e => setAbonoForm(p => ({ ...p, observacion: e.target.value }))}
                    placeholder="Ej: Segunda cuota"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
              </div>

              {formError && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#8B0000' }}>
                  {formLoading ? 'Registrando...' : 'Registrar abono'}
                </button>
                <button type="button" onClick={() => setShowAbono(null)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {showDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetalle(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="font-semibold text-zinc-100">Detalle del ingreso</h2>
              <button onClick={() => setShowDetalle(null)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-zinc-500 mb-1">Cliente</p><p className="text-zinc-200">{showDetalle.cliente?.name || '—'}</p></div>
                <div><p className="text-xs text-zinc-500 mb-1">Tipo</p><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLOR[showDetalle.tipoServicio]}`}>{TIPO_LABEL_FULL[showDetalle.tipoServicio]}</span></div>
                <div><p className="text-xs text-zinc-500 mb-1">Fecha</p><p className="text-zinc-200">{fmtDate(showDetalle.fechaIngreso)}</p></div>
                <div><p className="text-xs text-zinc-500 mb-1">Estado</p><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_COLOR[showDetalle.estadoPago]}`}>{ESTADO_LABEL[showDetalle.estadoPago]}</span></div>
              </div>

              {/* Montos */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-800/60 rounded-xl border border-zinc-700 text-center">
                <div><p className="text-xs text-zinc-500 mb-1">Valor total</p><p className="text-lg font-bold text-zinc-200">{fmt(showDetalle.monto)}</p></div>
                <div><p className="text-xs text-zinc-500 mb-1">Total abonado</p><p className="text-lg font-bold text-green-400">{fmt(showDetalle.montoPagado)}</p></div>
                <div><p className="text-xs text-zinc-500 mb-1">Saldo</p><p className="text-lg font-bold text-red-400">{fmt(showDetalle.saldoPendiente)}</p></div>
              </div>

              {/* Barra de progreso */}
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Porcentaje pagado</span><span>{showDetalle.porcentajePagado}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${showDetalle.porcentajePagado}%` }} />
                </div>
              </div>

              {/* Historial de abonos */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Historial de abonos</h3>
                {!detalleData ? (
                  <p className="text-xs text-zinc-500">Cargando...</p>
                ) : detalleData.abonos?.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sin abonos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {detalleData.abonos?.map((abono, idx) => (
                      <div key={abono.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{fmt(abono.monto)}</p>
                          <p className="text-xs text-zinc-500">{fmtDate(abono.fechaAbono)} · {abono.metodoPago ? METODO_LABEL[abono.metodoPago] : '—'} · {abono.creadoPorUser.name}</p>
                          {abono.observacion && <p className="text-xs text-zinc-600 mt-0.5">{abono.observacion}</p>}
                        </div>
                        <span className="text-xs text-zinc-600">#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showDetalle.observaciones && (
                <div><p className="text-xs text-zinc-500 mb-1">Observaciones</p><p className="text-sm text-zinc-400">{showDetalle.observaciones}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDelete(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-zinc-100 mb-2">¿Eliminar ingreso?</h2>
            <p className="text-sm text-zinc-400 mb-5">
              Se eliminará el registro de <strong className="text-zinc-200">{fmt(showDelete.monto)}</strong> del{' '}
              {fmtDate(showDelete.fechaIngreso)} junto con todos sus abonos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white bg-red-800 hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button onClick={() => setShowDelete(null)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
