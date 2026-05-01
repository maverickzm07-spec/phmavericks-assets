'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Sparkles, X } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'

type TipoServicio = 'FOTOGRAFIA' | 'REELS' | 'VIDEOS_HORIZONTALES' | 'IMAGENES_FLYERS' | 'PLAN_MENSUAL' | 'PERSONALIZADO'
type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'PARCIAL'
type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA' | 'OTRO'

interface Abono {
  id: string; monto: number; metodoPago: MetodoPago | null; fechaAbono: string
  observacion: string | null; creadoPorUser: { name: string }
}
interface Ingreso {
  id: string; clienteId: string | null; cliente: { id: string; name: string; business: string } | null
  tipoServicio: TipoServicio; descripcion: string | null; monto: number; montoPagado: number
  saldoPendiente: number; porcentajePagado: number; estadoPago: EstadoPago; metodoPago: MetodoPago | null
  fechaIngreso: string; observaciones: string | null; creadoPorUser: { name: string }
  abonos?: Abono[]; _count?: { abonos: number }
}
interface Totales { hoy: number; semana: number; mes: number; anio: number; total: number; pendiente: number; pagosCompletos: number; pagosParcialesCount: number; clientesConDeuda: number }
interface Client { id: string; name: string; business: string }

const TIPO_LABEL: Record<TipoServicio, string> = { FOTOGRAFIA: 'Fotografía', REELS: 'Reels', VIDEOS_HORIZONTALES: 'Videos horiz.', IMAGENES_FLYERS: 'Imágenes/Flyers', PLAN_MENSUAL: 'Plan mensual', PERSONALIZADO: 'Personalizado' }
const TIPO_LABEL_FULL: Record<TipoServicio, string> = { FOTOGRAFIA: 'Fotografía', REELS: 'Reels / Videos verticales', VIDEOS_HORIZONTALES: 'Videos horizontales', IMAGENES_FLYERS: 'Imágenes o flyers', PLAN_MENSUAL: 'Plan mensual', PERSONALIZADO: 'Personalizado' }
const TIPO_COLOR: Record<TipoServicio, string> = {
  FOTOGRAFIA: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  REELS: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  VIDEOS_HORIZONTALES: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  IMAGENES_FLYERS: 'bg-pink-950/60 text-pink-300 border-pink-800/60',
  PLAN_MENSUAL: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  PERSONALIZADO: 'bg-phm-surface/60 text-phm-gray border-phm-border-soft',
}
const ESTADO_COLOR: Record<EstadoPago, string> = {
  PAGADO: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  PENDIENTE: 'bg-red-950/60 text-red-300 border-red-900/60',
  PARCIAL: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
}
const ESTADO_LABEL: Record<EstadoPago, string> = { PAGADO: 'Pagado', PENDIENTE: 'Pendiente', PARCIAL: 'Parcial' }
const METODO_LABEL: Record<MetodoPago, string> = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', DEPOSITO: 'Depósito', TARJETA: 'Tarjeta', OTRO: 'Otro' }

const fmt = (n: number) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const EMPTY_FORM = { clienteId: '', tipoServicio: 'PLAN_MENSUAL' as TipoServicio, descripcion: '', monto: '', montoPagado: '0', metodoPago: '' as MetodoPago | '', fechaIngreso: new Date().toISOString().split('T')[0], observaciones: '' }

function calcAuto(monto: string, pagado: string) {
  const m = parseFloat(monto) || 0; const p = Math.min(parseFloat(pagado) || 0, m)
  const saldo = Math.max(0, m - p); const pct = m > 0 ? Math.min(100, Math.round((p / m) * 100)) : 0
  const estado: EstadoPago = p <= 0 ? 'PENDIENTE' : p >= m ? 'PAGADO' : 'PARCIAL'
  return { saldo, pct, estado }
}

const inputCls = 'w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
const selectCls = 'w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
const labelCls = 'block text-xs font-medium text-phm-gray-soft mb-1.5'

const ModalWrap = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
    {children}
  </div>
)

function IngresosPageInner() {
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
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d && ['SUPER_ADMIN', 'ADMIN'].includes(d.role)) { setAuthorized(true); setIsSuperAdmin(d.role === 'SUPER_ADMIN') }
      else setAuthorized(false)
    }).catch(() => setAuthorized(false))
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
    if (filtroPeriodo === 'rango') { if (filtroDesde) params.set('desde', filtroDesde); if (filtroHasta) params.set('hasta', filtroHasta) }
    const res = await fetch(`/api/ingresos?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [filtroTipo, filtroEstado, filtroCliente, filtroPeriodo, filtroDesde, filtroHasta])

  useEffect(() => { if (authorized) fetchData() }, [authorized, fetchData])
  useEffect(() => { if (authorized && createParam) { setForm({ ...EMPTY_FORM, clienteId: clienteIdParam }); setEditingIngreso(null); setFormError(''); setShowForm(true) } }, [authorized])

  const openCreate = () => { setEditingIngreso(null); setForm({ ...EMPTY_FORM, clienteId: filtroCliente }); setFormError(''); setShowForm(true) }
  const openEdit = (ing: Ingreso) => {
    setEditingIngreso(ing)
    setForm({ clienteId: ing.clienteId || '', tipoServicio: ing.tipoServicio, descripcion: ing.descripcion || '', monto: ing.monto.toString(), montoPagado: ing.montoPagado.toString(), metodoPago: ing.metodoPago || '', fechaIngreso: new Date(ing.fechaIngreso).toISOString().split('T')[0], observaciones: ing.observaciones || '' })
    setFormError(''); setShowForm(true)
  }
  const openDetalle = async (ing: Ingreso) => {
    setShowDetalle(ing); setDetalleData(null)
    const res = await fetch(`/api/ingresos/${ing.id}`)
    if (res.ok) setDetalleData(await res.json())
  }
  const openAbono = (ing: Ingreso) => { setShowAbono(ing); setAbonoForm({ monto: '', metodoPago: '', fechaAbono: new Date().toISOString().split('T')[0], observacion: '' }); setFormError('') }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = parseFloat(form.monto)
    if (isNaN(monto) || monto <= 0) { setFormError('El valor total debe ser mayor a 0'); return }
    const montoPagado = Math.min(parseFloat(form.montoPagado) || 0, monto)
    setFormLoading(true); setFormError('')
    try {
      const url = editingIngreso ? `/api/ingresos/${editingIngreso.id}` : '/api/ingresos'
      const method = editingIngreso ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: form.clienteId || null, tipoServicio: form.tipoServicio, descripcion: form.descripcion.trim() || undefined, monto, montoPagado, metodoPago: form.metodoPago || null, fechaIngreso: form.fechaIngreso, observaciones: form.observaciones.trim() || undefined }) })
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
      const res = await fetch(`/api/ingresos/${showAbono.id}/abonos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monto, metodoPago: abonoForm.metodoPago || null, fechaAbono: abonoForm.fechaAbono, observacion: abonoForm.observacion || undefined }) })
      if (res.ok) { setShowAbono(null); fetchData() }
      else { const d = await res.json(); setFormError(d.error || 'Error al registrar abono') }
    } catch { setFormError('Error de conexión') }
    finally { setFormLoading(false) }
  }

  const handleEstado = async (ing: Ingreso, estadoPago: EstadoPago) => {
    await fetch(`/api/ingresos/${ing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estadoPago }) })
    fetchData()
  }

  const handleDelete = async () => {
    if (!showDelete) return
    setDeleting(true)
    const res = await fetch(`/api/ingresos/${showDelete.id}`, { method: 'DELETE' })
    if (res.ok) { setShowDelete(null); fetchData() }
    setDeleting(false)
  }

  if (authorized === null) return (
    <div className="space-y-4">
      <div className="h-12 w-48 skeleton-shimmer rounded-lg" />
      <div className="h-40 skeleton-shimmer rounded-2xl" />
    </div>
  )

  if (!authorized) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-900/60 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Sin permisos</h2>
      <p className="text-phm-gray-soft text-sm mb-6">Solo administradores pueden acceder al módulo de Ingresos.</p>
      <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">Volver al dashboard</Link>
    </div>
  )

  const totales = data?.totales
  const ingresos = data?.ingresos || []
  const { saldo: formSaldo, pct: formPct, estado: formEstado } = calcAuto(form.monto, form.montoPagado)

  const filterBtnCls = (active: boolean) => `px-3 py-1 text-xs font-medium rounded-md transition-all ${active ? 'bg-phm-charcoal text-white border border-phm-border-soft' : 'text-phm-gray-soft hover:text-white hover:bg-phm-surface'}`

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Finanzas</span>
        </div>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Ingresos</h1>
            <p className="text-phm-gray-soft text-sm mt-1">{ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nuevo ingreso</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Hoy', value: totales?.hoy || 0, color: 'text-phm-gold', money: true },
          { label: 'Esta semana', value: totales?.semana || 0, color: 'text-blue-400', money: true },
          { label: 'Este mes', value: totales?.mes || 0, color: 'text-emerald-400', money: true },
          { label: 'Este año', value: totales?.anio || 0, color: 'text-purple-400', money: true },
          { label: 'Total cobrado', value: totales?.total || 0, color: 'text-amber-400', money: true },
          { label: 'Pendiente por cobrar', value: totales?.pendiente || 0, color: 'text-red-400', money: true, highlight: true },
          { label: 'Pagos completos', value: totales?.pagosCompletos || 0, color: 'text-emerald-400', money: false },
          { label: 'Pagos parciales', value: totales?.pagosParcialesCount || 0, color: 'text-amber-400', money: false },
          { label: 'Clientes con deuda', value: totales?.clientesConDeuda || 0, color: 'text-red-400', money: false },
        ].map(card => (
          <PremiumCard key={card.label} padding="md" className={card.highlight ? 'border-red-900/40' : ''}>
            <p className="text-xs text-phm-gray-soft mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>
              {card.money ? fmt(card.value as number) : card.value}
            </p>
          </PremiumCard>
        ))}
      </div>

      {/* Filtros */}
      <PremiumCard padding="md">
        <div className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {[{ key: '', label: 'Todos' }, { key: 'FOTOGRAFIA', label: 'Fotografía' }, { key: 'REELS', label: 'Reels' }, { key: 'VIDEOS_HORIZONTALES', label: 'Videos horiz.' }, { key: 'IMAGENES_FLYERS', label: 'Imágenes/Flyers' }, { key: 'PLAN_MENSUAL', label: 'Plan mensual' }, { key: 'PERSONALIZADO', label: 'Personalizado' }].map(t => (
              <button key={t.key} onClick={() => setFiltroTipo(t.key)} className={filterBtnCls(filtroTipo === t.key)}>{t.label}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-1">
              {[{ key: '', label: 'Todo estado' }, { key: 'PAGADO', label: 'Pagado' }, { key: 'PARCIAL', label: 'Parcial' }, { key: 'PENDIENTE', label: 'Pendiente' }].map(s => (
                <button key={s.key} onClick={() => setFiltroEstado(s.key)} className={filterBtnCls(filtroEstado === s.key)}>{s.label}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {[{ key: 'hoy', label: 'Hoy' }, { key: 'semana', label: 'Semana' }, { key: 'mes', label: 'Mes' }, { key: 'anio', label: 'Año' }, { key: '', label: 'Todo' }, { key: 'rango', label: 'Rango' }].map(p => (
                <button key={p.key} onClick={() => setFiltroPeriodo(p.key)} className={filterBtnCls(filtroPeriodo === p.key)}>{p.label}</button>
              ))}
            </div>
            {filtroPeriodo === 'rango' && (
              <div className="flex gap-2 items-center">
                <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="px-3 py-1 text-xs bg-phm-surface border border-phm-border-soft rounded-md text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors" />
                <span className="text-phm-gray-soft text-xs">—</span>
                <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="px-3 py-1 text-xs bg-phm-surface border border-phm-border-soft rounded-md text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors" />
              </div>
            )}
            <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="px-3 py-1 text-xs bg-phm-surface border border-phm-border-soft rounded-md text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors ml-auto">
              <option value="">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
            </select>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-phm-border-soft">
            <span className="text-xs text-phm-gray-soft">{ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-4 text-xs">
              <span className="text-phm-gray-soft">Cobrado: <span className="text-emerald-400 font-medium">{fmt(data?.totalFiltrado || 0)}</span></span>
              <span className="text-phm-gray-soft">Pendiente: <span className="text-red-400 font-medium">{fmt(data?.pendienteFiltrado || 0)}</span></span>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* Tabla */}
      <PremiumCard padding="none">
        {loading ? (
          <>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[58px] skeleton-shimmer border-b border-phm-border-soft last:border-0" />)}</>
        ) : ingresos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-white font-medium mb-1">No hay ingresos</p>
            <p className="text-phm-gray-soft text-sm mb-4">Registra el primer ingreso.</p>
            <button onClick={openCreate} className="text-sm font-semibold text-white px-4 py-2 bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">Nuevo ingreso</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                  {['Fecha', 'Cliente', 'Tipo', 'Descripción', 'Total', 'Abonado', 'Saldo', '%', 'Estado', 'Método', 'Acciones'].map(h => (
                    <th key={h} className={`text-${h === 'Acciones' ? 'right' : 'left'} text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3 whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-phm-border-soft">
                {ingresos.map(ing => (
                  <tr key={ing.id} className="row-hover">
                    <td className="px-4 py-3 text-xs text-phm-gray-soft whitespace-nowrap">{fmtDate(ing.fechaIngreso)}</td>
                    <td className="px-4 py-3">
                      {ing.cliente ? <div><p className="text-sm font-semibold text-white whitespace-nowrap">{ing.cliente.name}</p><p className="text-xs text-phm-gray-soft">{ing.cliente.business}</p></div>
                        : <span className="text-xs text-phm-gray-soft">—</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${TIPO_COLOR[ing.tipoServicio]}`}>{TIPO_LABEL[ing.tipoServicio]}</span></td>
                    <td className="px-4 py-3 text-xs text-phm-gray max-w-[140px] truncate">{ing.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap tabular-nums">{fmt(ing.monto)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-400 whitespace-nowrap tabular-nums">{fmt(ing.montoPagado)}</td>
                    <td className="px-4 py-3 text-sm text-red-400 whitespace-nowrap tabular-nums">{fmt(ing.saldoPendiente)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 min-w-[60px]">
                        <div className="flex-1 bg-phm-surface rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${ing.porcentajePagado}%` }} />
                        </div>
                        <span className="text-xs text-phm-gray tabular-nums">{ing.porcentajePagado}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${ESTADO_COLOR[ing.estadoPago]}`}>{ESTADO_LABEL[ing.estadoPago]}</span></td>
                    <td className="px-4 py-3 text-xs text-phm-gray-soft whitespace-nowrap">{ing.metodoPago ? METODO_LABEL[ing.metodoPago] : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end flex-wrap min-w-[180px]">
                        <button onClick={() => openDetalle(ing)} className="px-2 py-1 text-xs font-medium text-phm-gray hover:text-phm-gold border border-phm-border-soft hover:border-phm-gold/40 rounded transition-all">Ver</button>
                        <button onClick={() => openEdit(ing)} className="px-2 py-1 text-xs font-medium text-phm-gray hover:text-phm-gold border border-phm-border-soft hover:border-phm-gold/40 rounded transition-all">Editar</button>
                        {ing.estadoPago !== 'PAGADO' && <button onClick={() => openAbono(ing)} className="px-2 py-1 text-xs font-medium text-blue-300 border border-blue-900/50 bg-blue-950/30 hover:bg-blue-950/60 rounded transition-all">+ Abono</button>}
                        {ing.estadoPago !== 'PAGADO' && <button onClick={() => handleEstado(ing, 'PAGADO')} className="px-2 py-1 text-xs font-medium text-emerald-300 border border-emerald-900/50 bg-emerald-950/30 hover:bg-emerald-950/60 rounded transition-all">✓ Pagado</button>}
                        {ing.estadoPago !== 'PENDIENTE' && <button onClick={() => handleEstado(ing, 'PENDIENTE')} className="px-2 py-1 text-xs font-medium text-amber-300 border border-amber-900/50 bg-amber-950/30 hover:bg-amber-950/60 rounded transition-all">Pendiente</button>}
                        {isSuperAdmin && <button onClick={() => setShowDelete(ing)} className="px-2 py-1 text-xs font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded transition-all">Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCard>

      {/* Modal Crear/Editar */}
      {showForm && (
        <ModalWrap onClose={() => setShowForm(false)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-phm-border-soft sticky top-0 bg-phm-charcoal z-10">
              <h2 className="font-semibold text-white">{editingIngreso ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
              <button onClick={() => setShowForm(false)} className="text-phm-gray-soft hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Cliente *</label>
                  <select name="clienteId" value={form.clienteId} onChange={handleFormChange} required className={selectCls}>
                    <option value="">Selecciona un cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tipo de servicio *</label>
                  <select name="tipoServicio" value={form.tipoServicio} onChange={handleFormChange} className={selectCls}>
                    {Object.entries(TIPO_LABEL_FULL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fecha *</label>
                  <input name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={handleFormChange} required className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Descripción</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleFormChange} placeholder="Ej: Sesión fotográfica abril 2026" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor total ($) *</label>
                  <input name="monto" type="number" min="0.01" step="0.01" value={form.monto} onChange={handleFormChange} required placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Abono recibido ($)</label>
                  <input name="montoPagado" type="number" min="0" step="0.01" value={form.montoPagado} onChange={handleFormChange} placeholder="0.00" className={inputCls} />
                </div>
                {form.monto && (
                  <div className="col-span-2 grid grid-cols-3 gap-3 p-3 bg-phm-surface border border-phm-border-soft rounded-lg">
                    <div className="text-center"><p className="text-xs text-phm-gray-soft mb-0.5">Saldo pendiente</p><p className="text-sm font-bold text-red-400">{fmt(formSaldo)}</p></div>
                    <div className="text-center"><p className="text-xs text-phm-gray-soft mb-0.5">% pagado</p><p className="text-sm font-bold text-white">{formPct}%</p></div>
                    <div className="text-center"><p className="text-xs text-phm-gray-soft mb-0.5">Estado</p><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_COLOR[formEstado]}`}>{ESTADO_LABEL[formEstado]}</span></div>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Método de pago *</label>
                  <select name="metodoPago" value={form.metodoPago} onChange={handleFormChange} required className={selectCls}>
                    <option value="">Selecciona...</option>
                    {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Observaciones</label>
                  <textarea name="observaciones" value={form.observaciones} onChange={handleFormChange} rows={2} placeholder="Notas adicionales..." className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
                </div>
              </div>
              {formError && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
                  {formLoading ? 'Guardando...' : editingIngreso ? 'Guardar cambios' : 'Registrar ingreso'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </ModalWrap>
      )}

      {/* Modal Abono */}
      {showAbono && (
        <ModalWrap onClose={() => setShowAbono(null)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-phm-border-soft">
              <h2 className="font-semibold text-white">Agregar abono</h2>
              <button onClick={() => setShowAbono(null)} className="text-phm-gray-soft hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAbono} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3 bg-phm-surface border border-phm-border-soft rounded-lg text-center">
                <div><p className="text-xs text-phm-gray-soft mb-0.5">Valor total</p><p className="text-sm font-bold text-white">{fmt(showAbono.monto)}</p></div>
                <div><p className="text-xs text-phm-gray-soft mb-0.5">Total abonado</p><p className="text-sm font-bold text-emerald-400">{fmt(showAbono.montoPagado)}</p></div>
                <div><p className="text-xs text-phm-gray-soft mb-0.5">Saldo</p><p className="text-sm font-bold text-red-400">{fmt(showAbono.saldoPendiente)}</p></div>
              </div>
              {showAbono.cliente && <p className="text-xs text-phm-gray-soft">Cliente: <span className="text-white">{showAbono.cliente.name}</span> · {showAbono.descripcion || TIPO_LABEL_FULL[showAbono.tipoServicio]}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nuevo abono ($) *</label>
                  <input type="number" min="0.01" step="0.01" value={abonoForm.monto} onChange={e => setAbonoForm(p => ({ ...p, monto: e.target.value }))} required placeholder={`Máx. ${fmt(showAbono.saldoPendiente)}`} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha del abono *</label>
                  <input type="date" value={abonoForm.fechaAbono} onChange={e => setAbonoForm(p => ({ ...p, fechaAbono: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Método de pago *</label>
                  <select value={abonoForm.metodoPago} onChange={e => setAbonoForm(p => ({ ...p, metodoPago: e.target.value as MetodoPago | '' }))} required className={selectCls}>
                    <option value="">Selecciona...</option>
                    {Object.entries(METODO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Observación</label>
                  <input value={abonoForm.observacion} onChange={e => setAbonoForm(p => ({ ...p, observacion: e.target.value }))} placeholder="Ej: Segunda cuota" className={inputCls} />
                </div>
              </div>
              {formError && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
                  {formLoading ? 'Registrando...' : 'Registrar abono'}
                </button>
                <button type="button" onClick={() => setShowAbono(null)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </ModalWrap>
      )}

      {/* Modal Detalle */}
      {showDetalle && (
        <ModalWrap onClose={() => setShowDetalle(null)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-phm-border-soft sticky top-0 bg-phm-charcoal z-10">
              <h2 className="font-semibold text-white">Detalle del ingreso</h2>
              <button onClick={() => setShowDetalle(null)} className="text-phm-gray-soft hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-phm-gray-soft mb-1">Cliente</p><p className="text-white">{showDetalle.cliente?.name || '—'}</p></div>
                <div><p className="text-xs text-phm-gray-soft mb-1">Tipo</p><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLOR[showDetalle.tipoServicio]}`}>{TIPO_LABEL_FULL[showDetalle.tipoServicio]}</span></div>
                <div><p className="text-xs text-phm-gray-soft mb-1">Fecha</p><p className="text-white">{fmtDate(showDetalle.fechaIngreso)}</p></div>
                <div><p className="text-xs text-phm-gray-soft mb-1">Estado</p><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_COLOR[showDetalle.estadoPago]}`}>{ESTADO_LABEL[showDetalle.estadoPago]}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4 bg-phm-surface border border-phm-border-soft rounded-xl text-center">
                <div><p className="text-xs text-phm-gray-soft mb-1">Valor total</p><p className="text-lg font-bold text-white">{fmt(showDetalle.monto)}</p></div>
                <div><p className="text-xs text-phm-gray-soft mb-1">Total abonado</p><p className="text-lg font-bold text-emerald-400">{fmt(showDetalle.montoPagado)}</p></div>
                <div><p className="text-xs text-phm-gray-soft mb-1">Saldo</p><p className="text-lg font-bold text-red-400">{fmt(showDetalle.saldoPendiente)}</p></div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-phm-gray-soft mb-1.5"><span>Porcentaje pagado</span><span>{showDetalle.porcentajePagado}%</span></div>
                <div className="w-full bg-phm-surface rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${showDetalle.porcentajePagado}%` }} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Historial de abonos</h3>
                {!detalleData ? <p className="text-xs text-phm-gray-soft">Cargando...</p>
                  : detalleData.abonos?.length === 0 ? <p className="text-xs text-phm-gray-soft">Sin abonos registrados.</p>
                  : (
                    <div className="space-y-2">
                      {detalleData.abonos?.map((abono, idx) => (
                        <div key={abono.id} className="flex items-center justify-between p-3 bg-phm-surface border border-phm-border-soft rounded-lg">
                          <div>
                            <p className="text-sm font-semibold text-white">{fmt(abono.monto)}</p>
                            <p className="text-xs text-phm-gray-soft">{fmtDate(abono.fechaAbono)} · {abono.metodoPago ? METODO_LABEL[abono.metodoPago] : '—'} · {abono.creadoPorUser.name}</p>
                            {abono.observacion && <p className="text-xs text-phm-gray-soft opacity-70 mt-0.5">{abono.observacion}</p>}
                          </div>
                          <span className="text-xs text-phm-gray-soft">#{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              {showDetalle.observaciones && <div><p className="text-xs text-phm-gray-soft mb-1">Observaciones</p><p className="text-sm text-phm-gray">{showDetalle.observaciones}</p></div>}
            </div>
          </div>
        </ModalWrap>
      )}

      {/* Modal Eliminar */}
      {showDelete && (
        <ModalWrap onClose={() => setShowDelete(null)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-white mb-2">¿Eliminar ingreso?</h2>
            <p className="text-sm text-phm-gray mb-5">
              Se eliminará el registro de <strong className="text-white">{fmt(showDelete.monto)}</strong> del {fmtDate(showDelete.fechaIngreso)} junto con todos sus abonos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white bg-phm-red hover:bg-phm-red-hover transition-colors disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button onClick={() => setShowDelete(null)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
            </div>
          </div>
        </ModalWrap>
      )}
    </div>
  )
}

export default function IngresosPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><div className="h-12 w-48 skeleton-shimmer rounded-lg" /><div className="h-40 skeleton-shimmer rounded-2xl" /></div>}>
      <IngresosPageInner />
    </Suspense>
  )
}
