'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Receipt, Tag, Wallet, X } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

const METODOS_PAGO = [
  { value: '', label: 'Sin especificar' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
]

interface Categoria { id: string; nombre: string; esDefault: boolean; activa: boolean }
interface Gasto {
  id: string
  fecha: string
  concepto: string
  monto: number
  proveedor: string | null
  metodoPago: string | null
  estado: 'PAGADO' | 'PENDIENTE'
  observaciones: string | null
  categoria: { id: string; nombre: string }
  project: { id: string; nombre: string; client?: { name: string } } | null
  _count?: { documentos: number }
}
interface Totales {
  total: number; pagado: number; porPagar: number
  porProyecto: number; generales: number; cantidad: number; sinComprobante: number
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [porCategoria, setPorCategoria] = useState<{ nombre: string; total: number; cantidad: number }[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [filtros, setFiltros] = useState({ desde: '', hasta: '', categoriaId: '', ambito: '', estado: '' })

  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    fecha: hoyISO(), concepto: '', categoriaId: '', monto: '',
    proveedor: '', metodoPago: '', estado: 'PAGADO', projectId: '', observaciones: '',
  })

  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
    try {
      const res = await fetch(`/api/gastos?${params}`)
      if (!res.ok) { setError('No se pudieron cargar los gastos'); setGastos([]); return }
      const data = await res.json()
      setGastos(Array.isArray(data.gastos) ? data.gastos : [])
      setTotales(data.totales ?? null)
      setPorCategoria(Array.isArray(data.porCategoria) ? data.porCategoria : [])
      setError('')
    } catch {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    fetch('/api/gastos/categorias').then((r) => r.ok ? r.json() : []).then((d) => {
      const lista = Array.isArray(d) ? d : []
      setCategorias(lista)
      setForm((f) => f.categoriaId ? f : { ...f, categoriaId: lista[0]?.id ?? '' })
    }).catch(() => setCategorias([]))
    fetch('/api/proyectos').then((r) => r.ok ? r.json() : []).then((d) => setProyectos(Array.isArray(d) ? d : [])).catch(() => setProyectos([]))
  }, [])

  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return
    setCreandoCategoria(true)
    try {
      const res = await fetch('/api/gastos/categorias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaCategoria.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No se pudo crear la categoría'); return }
      setCategorias((prev) => [...prev, data])
      setForm((f) => ({ ...f, categoriaId: data.id }))
      setNuevaCategoria('')
      setError('')
    } finally {
      setCreandoCategoria(false)
    }
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = Number(form.monto)
    if (!form.concepto.trim()) { setError('El concepto es obligatorio'); return }
    if (!form.categoriaId) { setError('Selecciona una categoría'); return }
    if (!monto || monto <= 0) { setError('El valor debe ser mayor que cero'); return }

    setGuardando(true); setError('')
    try {
      const res = await fetch('/api/gastos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: form.fecha,
          concepto: form.concepto.trim(),
          categoriaId: form.categoriaId,
          monto,
          proveedor: form.proveedor.trim() || null,
          metodoPago: form.metodoPago || null,
          estado: form.estado,
          projectId: form.projectId || null,
          observaciones: form.observaciones.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No se pudo registrar el gasto'); return }
      setAbierto(false)
      setForm({ fecha: hoyISO(), concepto: '', categoriaId: categorias[0]?.id ?? '', monto: '', proveedor: '', metodoPago: '', estado: 'PAGADO', projectId: '', observaciones: '' })
      await cargar()
    } catch {
      setError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    const res = await fetch(`/api/gastos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'No se pudo eliminar el gasto')
      return
    }
    await cargar()
  }

  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'
  const filtroCls = 'px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
            <Wallet className="w-4 h-4" />
            <span className="text-gold-premium">Finanzas</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold text-white tracking-tight">Gastos</h1>
          <p className="text-phm-gray-soft text-sm mt-1">Egresos por proyecto y gastos generales de la empresa</p>
        </div>
        <button onClick={() => setAbierto((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
          {abierto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {abierto ? 'Cerrar' : 'Nuevo gasto'}
        </button>
      </header>

      {abierto && (
        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-4">Registrar gasto</h2>
          <form onSubmit={guardar} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="fecha">Fecha *</label>
                <input id="fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="monto">Valor (USD) *</label>
                <input id="monto" type="number" min="0.01" step="0.01" value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })} required placeholder="0.00" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="concepto">Concepto *</label>
              <input id="concepto" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                required placeholder="Ej: Combustible viaje a Calderón" className={inputCls} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="categoriaId">Categoría *</label>
                <select id="categoriaId" value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} required className={selectCls}>
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="estado">Estado</label>
                <select id="estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={selectCls}>
                  <option value="PAGADO">Pagado</option>
                  <option value="PENDIENTE">Pendiente de pago</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className={labelCls} htmlFor="nuevaCat">Crear categoría nueva</label>
                <input id="nuevaCat" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Ej: Alquiler de equipos" className={inputCls} />
              </div>
              <button type="button" onClick={crearCategoria} disabled={creandoCategoria || !nuevaCategoria.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-phm-gold border border-phm-gold/30 hover:border-phm-gold/60 bg-phm-surface rounded-lg transition-colors disabled:opacity-40">
                <Tag className="w-3.5 h-3.5" /> {creandoCategoria ? 'Creando...' : 'Agregar'}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="proveedor">Proveedor o beneficiario</label>
                <input id="proveedor" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="metodoPago">Método de pago</label>
                <select id="metodoPago" value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })} className={selectCls}>
                  {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="projectId">Proyecto relacionado <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
              <select id="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className={selectCls}>
                <option value="">Gasto general de la empresa</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.client?.name ? ` — ${p.client.name}` : ''}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-phm-gray-soft">
                Si lo asocias a un proyecto, afectará el resultado de ese trabajo. Si no, cuenta como gasto general.
              </p>
            </div>

            <div>
              <label className={labelCls} htmlFor="observaciones">Observaciones</label>
              <textarea id="observaciones" rows={2} value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className={inputCls} />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={guardando}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Registrar gasto'}
              </button>
              <button type="button" onClick={() => setAbierto(false)}
                className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:border-phm-gold/40 rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </PremiumCard>
      )}

      {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}

      {totales && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Totales de gastos">
          {[
            { label: 'Total del período', valor: totales.total, nota: `${totales.cantidad} registros`, tono: 'text-white' },
            { label: 'Pagado', valor: totales.pagado, nota: 'Salida real de caja', tono: 'text-emerald-400' },
            { label: 'Por pagar', valor: totales.porPagar, nota: 'Cuentas por pagar', tono: 'text-amber-400' },
            { label: 'Gastos por proyecto', valor: totales.porProyecto, nota: `Generales: ${formatCurrency(totales.generales)}`, tono: 'text-phm-gold' },
          ].map((t) => (
            <PremiumCard key={t.label} padding="md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-phm-gray-soft">{t.label}</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${t.tono}`}>{formatCurrency(t.valor)}</p>
              <p className="mt-1 text-xs text-phm-gray-soft">{t.nota}</p>
            </PremiumCard>
          ))}
        </section>
      )}

      <PremiumCard padding="sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
            className={filtroCls} aria-label="Desde" />
          <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
            className={filtroCls} aria-label="Hasta" />
          <select value={filtros.categoriaId} onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })} className={filtroCls}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filtros.ambito} onChange={(e) => setFiltros({ ...filtros, ambito: e.target.value })} className={filtroCls}>
            <option value="">Todos los ámbitos</option>
            <option value="proyecto">Por proyecto</option>
            <option value="general">Generales</option>
          </select>
          <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} className={filtroCls}>
            <option value="">Todos los estados</option>
            <option value="PAGADO">Pagados</option>
            <option value="PENDIENTE">Pendientes</option>
          </select>
        </div>
      </PremiumCard>

      {porCategoria.length > 0 && (
        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-3">Total por categoría</h2>
          <ul className="space-y-2">
            {porCategoria.map((c) => (
              <li key={c.nombre} className="flex items-center justify-between text-sm">
                <span className="text-phm-gray">{c.nombre} <span className="text-phm-gray-soft text-xs">({c.cantidad})</span></span>
                <span className="font-semibold text-white tabular-nums">{formatCurrency(c.total)}</span>
              </li>
            ))}
          </ul>
        </PremiumCard>
      )}

      {cargando ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded-xl" />)}</div>
      ) : gastos.length === 0 ? (
        <PremiumCard padding="none">
          <EmptyState title="Sin gastos registrados"
            description="Registra el primer gasto para empezar a medir el resultado real de la operación." />
        </PremiumCard>
      ) : (
        <PremiumCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 760 }}>
              <thead>
                <tr className="border-b border-phm-border-soft">
                  {['Fecha', 'Concepto', 'Categoría', 'Ámbito', 'Estado', 'Valor', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-phm-gray-soft">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-phm-border-soft">
                {gastos.map((g) => (
                  <tr key={g.id} className="row-hover">
                    <td className="px-4 py-3 text-phm-gray whitespace-nowrap">{new Date(g.fecha).toLocaleDateString('es-EC')}</td>
                    <td className="px-4 py-3">
                      <p className="text-white">{g.concepto}</p>
                      {g.proveedor && <p className="text-xs text-phm-gray-soft">{g.proveedor}</p>}
                    </td>
                    <td className="px-4 py-3 text-phm-gray">{g.categoria.nombre}</td>
                    <td className="px-4 py-3 text-xs">
                      {g.project
                        ? <span className="text-phm-gold">{g.project.nombre}</span>
                        : <span className="text-phm-gray-soft">General</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${g.estado === 'PAGADO' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-amber-950/50 text-amber-300'}`}>
                        {g.estado === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white tabular-nums whitespace-nowrap">{formatCurrency(g.monto)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => eliminar(g.id)}
                        className="text-xs text-phm-gray-soft hover:text-red-400 transition-colors" aria-label={`Eliminar ${g.concepto}`}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totales && totales.sinComprobante > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 border-t border-phm-border-soft text-xs text-amber-300">
              <Receipt className="w-3.5 h-3.5" />
              {totales.sinComprobante} {totales.sinComprobante === 1 ? 'gasto sin comprobante adjunto' : 'gastos sin comprobante adjunto'}
            </div>
          )}
        </PremiumCard>
      )}
    </div>
  )
}
