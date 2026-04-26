'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type TipoServicio = 'FOTOGRAFIA' | 'REELS' | 'VIDEOS_HORIZONTALES' | 'IMAGENES_FLYERS' | 'PLAN_MENSUAL' | 'PERSONALIZADO'
type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'PARCIAL'
type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO' | 'TARJETA' | 'OTRO'

interface Ingreso {
  id: string
  clienteId: string | null
  cliente: { id: string; name: string; business: string } | null
  tipoServicio: TipoServicio
  descripcion: string | null
  monto: number
  montoPagado: number
  estadoPago: EstadoPago
  metodoPago: MetodoPago | null
  fechaIngreso: string
  observaciones: string | null
  creadoPorUser: { name: string }
}

interface Totales { hoy: number; semana: number; mes: number; anio: number; total: number; pendiente: number }
interface Client { id: string; name: string; business: string }

const TIPO_LABEL: Record<TipoServicio, string> = {
  FOTOGRAFIA: 'Fotografía',
  REELS: 'Reels / Videos verticales',
  VIDEOS_HORIZONTALES: 'Videos horizontales',
  IMAGENES_FLYERS: 'Imágenes o flyers',
  PLAN_MENSUAL: 'Plan mensual',
  PERSONALIZADO: 'Personalizado',
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
  PENDIENTE: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  PARCIAL: 'bg-orange-950 text-orange-400 border-orange-800',
}

const ESTADO_LABEL: Record<EstadoPago, string> = { PAGADO: 'Pagado', PENDIENTE: 'Pendiente', PARCIAL: 'Parcial' }
const METODO_LABEL: Record<MetodoPago, string> = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', DEPOSITO: 'Depósito', TARJETA: 'Tarjeta', OTRO: 'Otro' }

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const EMPTY_FORM = {
  clienteId: '',
  tipoServicio: 'PLAN_MENSUAL' as TipoServicio,
  descripcion: '',
  monto: '',
  montoPagado: '',
  estadoPago: 'PENDIENTE' as EstadoPago,
  metodoPago: '' as MetodoPago | '',
  fechaIngreso: new Date().toISOString().split('T')[0],
  observaciones: '',
}

export default function IngresosPage() {
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get('clienteId') || ''
  const createParam = searchParams.get('create') === '1'

  const [data, setData] = useState<{ ingresos: Ingreso[]; totales: Totales; totalFiltrado: number } | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroCliente, setFiltroCliente] = useState(clienteIdParam)

  const [showForm, setShowForm] = useState(false)
  const [editingIngreso, setEditingIngreso] = useState<Ingreso | null>(null)
  const [showDelete, setShowDelete] = useState<Ingreso | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, clienteId: clienteIdParam })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && ['SUPER_ADMIN', 'ADMIN'].includes(d.role)) {
          setAuthorized(true)
          setIsSuperAdmin(d.role === 'SUPER_ADMIN')
        } else {
          setAuthorized(false)
        }
      })
      .catch(() => setAuthorized(false))
  }, [])

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroTipo) params.set('tipo', filtroTipo)
    if (filtroPeriodo) params.set('periodo', filtroPeriodo)
    if (filtroPeriodo === 'rango') {
      if (filtroDesde) params.set('desde', filtroDesde)
      if (filtroHasta) params.set('hasta', filtroHasta)
    }
    const res = await fetch(`/api/ingresos?${params}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    }
    setLoading(false)
  }

  useEffect(() => { if (authorized) fetchData() }, [authorized, filtroTipo, filtroPeriodo, filtroDesde, filtroHasta])

  useEffect(() => {
    if (authorized && createParam) {
      setForm({ ...EMPTY_FORM, clienteId: clienteIdParam })
      setEditingIngreso(null)
      setShowForm(true)
    }
  }, [authorized, createParam])

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
      estadoPago: ingreso.estadoPago,
      metodoPago: ingreso.metodoPago || '',
      fechaIngreso: new Date(ingreso.fechaIngreso).toISOString().split('T')[0],
      observaciones: ingreso.observaciones || '',
    })
    setFormError('')
    setShowForm(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = parseFloat(form.monto)
    if (isNaN(monto) || monto <= 0) { setFormError('El monto debe ser un número positivo'); return }
    setFormLoading(true)
    setFormError('')

    const montoPagado = form.estadoPago === 'PAGADO' ? monto
      : form.estadoPago === 'PENDIENTE' ? 0
      : parseFloat(form.montoPagado) || 0

    const payload = {
      clienteId: form.clienteId || null,
      tipoServicio: form.tipoServicio,
      descripcion: form.descripcion.trim() || undefined,
      monto,
      montoPagado,
      estadoPago: form.estadoPago,
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

  const handleEstado = async (ingreso: Ingreso, estadoPago: EstadoPago) => {
    await fetch(`/api/ingresos/${ingreso.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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

  const ingresosFiltrados = data?.ingresos.filter(i =>
    !filtroCliente || i.clienteId === filtroCliente
  ) || []

  if (authorized === null) return <div className="text-zinc-500 text-sm py-10 text-center">Verificando acceso...</div>
  if (!authorized) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-950 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V7m0 0V5m0 2h2m-2 0H10M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-zinc-100 mb-2">Sin permisos</h2>
      <p className="text-zinc-500 text-sm mb-6">Solo administradores pueden acceder a los ingresos.</p>
      <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#8B0000' }}>
        Volver al dashboard
      </Link>
    </div>
  )

  const totales = data?.totales

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Ingresos</h1>
          <p className="text-zinc-500 text-sm">{ingresosFiltrados.length} registro{ingresosFiltrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#8B0000' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Nuevo ingreso</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Hoy', value: totales?.hoy || 0, color: '#8B0000' },
          { label: 'Esta semana', value: totales?.semana || 0, color: '#1d4ed8' },
          { label: 'Este mes', value: totales?.mes || 0, color: '#15803d' },
          { label: 'Este año', value: totales?.anio || 0, color: '#7c3aed' },
          { label: 'Total general', value: totales?.total || 0, color: '#b45309' },
          { label: 'Pendiente por cobrar', value: totales?.pendiente || 0, color: '#dc2626', isPendiente: true },
        ].map(card => (
          <div key={card.label} className={`bg-zinc-900 border rounded-xl p-4 ${card.isPendiente ? 'border-red-900/50' : 'border-zinc-800'}`}>
            <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.isPendiente ? 'text-red-400' : 'text-white'}`}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        {/* Tipo filter */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: '', label: 'Todos' },
            { key: 'FOTOGRAFIA', label: 'Fotografía' },
            { key: 'REELS', label: 'Reels' },
            { key: 'VIDEOS_HORIZONTALES', label: 'Videos horiz.' },
            { key: 'IMAGENES_FLYERS', label: 'Imágenes/Flyers' },
            { key: 'PLAN_MENSUAL', label: 'Plan mensual' },
            { key: 'PERSONALIZADO', label: 'Personalizado' },
          ].map(t => (
            <button key={t.key} onClick={() => setFiltroTipo(t.key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filtroTipo === t.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Periodo filter */}
          <div className="flex gap-1">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mes' },
              { key: 'anio', label: 'Año' },
              { key: '', label: 'Todo' },
              { key: 'rango', label: 'Rango' },
            ].map(p => (
              <button key={p.key} onClick={() => setFiltroPeriodo(p.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filtroPeriodo === p.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range inputs */}
          {filtroPeriodo === 'rango' && (
            <div className="flex gap-2 items-center">
              <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
                className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 focus:outline-none focus:border-zinc-500" />
              <span className="text-zinc-600 text-xs">—</span>
              <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
                className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 focus:outline-none focus:border-zinc-500" />
            </div>
          )}

          {/* Cliente filter */}
          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
            className="px-3 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 focus:outline-none focus:border-zinc-500 ml-auto">
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
          </select>
        </div>

        {/* Total filtrado */}
        <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">{ingresosFiltrados.length} registro{ingresosFiltrados.length !== 1 ? 's' : ''} filtrado{ingresosFiltrados.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-semibold text-white">
            Total cobrado: <span style={{ color: '#ef4444' }}>{fmt(ingresosFiltrados.filter(i => i.estadoPago !== 'PENDIENTE').reduce((s, i) => s + i.montoPagado, 0))}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : ingresosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-zinc-400 font-medium mb-1">No hay ingresos</p>
            <p className="text-zinc-600 text-sm mb-4">Registra el primer ingreso del sistema.</p>
            <button onClick={openCreate} className="text-sm font-medium text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#8B0000' }}>
              Nuevo ingreso
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Fecha</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Descripción</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Monto</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Método</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {ingresosFiltrados.map(ingreso => (
                  <tr key={ingreso.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-zinc-400 whitespace-nowrap">
                      {new Date(ingreso.fechaIngreso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      {ingreso.cliente ? (
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{ingreso.cliente.name}</p>
                          <p className="text-xs text-zinc-500">{ingreso.cliente.business}</p>
                        </div>
                      ) : <span className="text-xs text-zinc-600">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLOR[ingreso.tipoServicio]}`}>
                        {TIPO_LABEL[ingreso.tipoServicio]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400 max-w-[180px] truncate">
                      {ingreso.descripcion || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{fmt(ingreso.monto)}</p>
                        {ingreso.estadoPago === 'PARCIAL' && (
                          <p className="text-xs text-orange-400">Abonado: {fmt(ingreso.montoPagado)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_COLOR[ingreso.estadoPago]}`}>
                        {ESTADO_LABEL[ingreso.estadoPago]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">
                      {ingreso.metodoPago ? METODO_LABEL[ingreso.metodoPago] : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {ingreso.estadoPago !== 'PAGADO' && (
                          <button onClick={() => handleEstado(ingreso, 'PAGADO')}
                            className="px-2 py-1 text-xs font-medium text-green-400 bg-green-950/50 hover:bg-green-950 rounded transition-all">
                            Marcar pagado
                          </button>
                        )}
                        {ingreso.estadoPago !== 'PENDIENTE' && (
                          <button onClick={() => handleEstado(ingreso, 'PENDIENTE')}
                            className="px-2 py-1 text-xs font-medium text-yellow-400 bg-yellow-950/50 hover:bg-yellow-950 rounded transition-all">
                            Marcar pendiente
                          </button>
                        )}
                        <button onClick={() => openEdit(ingreso)}
                          className="px-2 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-all">
                          Editar
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => setShowDelete(ingreso)}
                            className="px-2 py-1 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded transition-all">
                            Eliminar
                          </button>
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

      {/* ── MODAL CREAR / EDITAR ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-zinc-100">{editingIngreso ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cliente</label>
                  <select name="clienteId" value={form.clienteId} onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="">Sin cliente asociado</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo de servicio *</label>
                  <select name="tipoServicio" value={form.tipoServicio} onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="FOTOGRAFIA">Fotografía</option>
                    <option value="REELS">Reels / Videos verticales</option>
                    <option value="VIDEOS_HORIZONTALES">Videos horizontales</option>
                    <option value="IMAGENES_FLYERS">Imágenes o flyers</option>
                    <option value="PLAN_MENSUAL">Plan mensual</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha del ingreso *</label>
                  <input name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={handleFormChange} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descripción</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleFormChange}
                    placeholder="Ej: Sesión fotográfica marzo 2026"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monto ($) *</label>
                  <input name="monto" type="number" min="0.01" step="0.01" value={form.monto} onChange={handleFormChange} required
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Estado de pago *</label>
                  <select name="estadoPago" value={form.estadoPago} onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="PAGADO">Pagado</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PARCIAL">Parcial</option>
                  </select>
                </div>

                {form.estadoPago === 'PARCIAL' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monto abonado ($)</label>
                    <input name="montoPagado" type="number" min="0" step="0.01" value={form.montoPagado} onChange={handleFormChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Método de pago</label>
                  <select name="metodoPago" value={form.metodoPago} onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    <option value="">Sin especificar</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="DEPOSITO">Depósito</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="OTRO">Otro</option>
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
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#8B0000' }}>
                  {formLoading ? 'Guardando...' : editingIngreso ? 'Guardar cambios' : 'Registrar ingreso'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
                  Cancelar
                </button>
              </div>
            </form>
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
              {new Date(showDelete.fechaIngreso).toLocaleDateString('es-MX')}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white bg-red-800 hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button onClick={() => setShowDelete(null)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
