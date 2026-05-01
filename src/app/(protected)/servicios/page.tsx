'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, X, UserPlus } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'

type PlanType = 'CONTENIDO' | 'IA' | 'FOTOGRAFIA' | 'PERSONALIZADO'
type Modalidad = 'MENSUAL' | 'OCASIONAL'

interface ServicePlan {
  id: string
  nombre: string
  tipo: PlanType
  modalidad: Modalidad
  precio: number
  cantidadReels: number
  cantidadVideosHorizontales: number
  cantidadFotos: number
  jornadasGrabacion: number
  duracion: string | null
  cantidadImagenesFlyers: number
  descripcion: string | null
  caracteristicas: string[]
  esDefault: boolean
  activo: boolean
  _count?: { clients: number }
}

interface Client { id: string; name: string; business: string }

const TIPO_LABEL: Record<PlanType, string> = { CONTENIDO: 'Contenido', IA: 'IA', FOTOGRAFIA: 'Fotografía', PERSONALIZADO: 'Personalizado' }

const TIPO_COLOR: Record<PlanType, string> = {
  CONTENIDO: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  IA: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  FOTOGRAFIA: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  PERSONALIZADO: 'bg-phm-surface/60 text-phm-gray border-phm-border-soft',
}

const TABS = [
  { key: '', label: 'Todos' }, { key: 'CONTENIDO', label: 'Contenido' },
  { key: 'IA', label: 'IA' }, { key: 'FOTOGRAFIA', label: 'Fotografía' },
  { key: 'PERSONALIZADO', label: 'Personalizados' },
]

const EMPTY_FORM = {
  nombre: '', tipo: 'PERSONALIZADO' as PlanType, modalidad: 'MENSUAL' as Modalidad,
  precio: '', cantidadReels: '', cantidadVideosHorizontales: '', cantidadFotos: '',
  jornadasGrabacion: '', duracion: '', cantidadImagenesFlyers: '', descripcion: '', caracteristicas: '',
}

const inputCls = 'w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
const labelCls = 'block text-xs font-medium text-phm-gray-soft mb-1.5'
const selectCls = 'w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'

export default function ServiciosPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [showAssign, setShowAssign] = useState<ServicePlan | null>(null)
  const [showDeactivate, setShowDeactivate] = useState<ServicePlan | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<ServicePlan | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [assignClientId, setAssignClientId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  const fetchPlans = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab) params.set('tipo', tab)
    if (showInactive) params.set('activo', 'false')
    const res = await fetch(`/api/servicios?${params}`)
    const data = await res.json()
    setPlans(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [tab, showInactive])
  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => setClients([]))
  }, [])

  const openCreate = () => { setEditingPlan(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true) }
  const openEdit = (plan: ServicePlan) => {
    setEditingPlan(plan)
    setForm({
      nombre: plan.nombre, tipo: plan.tipo, modalidad: plan.modalidad || 'MENSUAL',
      precio: plan.precio.toString(), cantidadReels: plan.cantidadReels.toString(),
      cantidadVideosHorizontales: plan.cantidadVideosHorizontales.toString(),
      cantidadFotos: plan.cantidadFotos.toString(), jornadasGrabacion: plan.jornadasGrabacion.toString(),
      duracion: plan.duracion || '', cantidadImagenesFlyers: plan.cantidadImagenesFlyers.toString(),
      descripcion: plan.descripcion || '', caracteristicas: plan.caracteristicas.join('\n'),
    })
    setFormError(''); setShowForm(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true); setFormError('')
    const precio = parseFloat(form.precio)
    if (isNaN(precio) || precio <= 0) { setFormError('El precio debe ser un número positivo'); setFormLoading(false); return }
    const payload = {
      nombre: form.nombre.trim(), tipo: form.tipo, modalidad: form.modalidad, precio,
      cantidadReels: parseInt(form.cantidadReels) || 0,
      cantidadVideosHorizontales: parseInt(form.cantidadVideosHorizontales) || 0,
      cantidadFotos: parseInt(form.cantidadFotos) || 0,
      jornadasGrabacion: parseInt(form.jornadasGrabacion) || 0,
      duracion: form.duracion.trim() || undefined,
      cantidadImagenesFlyers: parseInt(form.cantidadImagenesFlyers) || 0,
      descripcion: form.descripcion.trim() || undefined,
      caracteristicas: form.caracteristicas.split('\n').map((s) => s.trim()).filter(Boolean),
    }
    try {
      const url = editingPlan ? `/api/servicios/${editingPlan.id}` : '/api/servicios'
      const method = editingPlan ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { setShowForm(false); fetchPlans() }
      else { const data = await res.json(); setFormError(data.error || 'Error al guardar') }
    } catch { setFormError('Error de conexión') }
    finally { setFormLoading(false) }
  }

  const handleToggleActive = async (plan: ServicePlan) => {
    await fetch(`/api/servicios/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !plan.activo }) })
    setShowDeactivate(null); fetchPlans()
  }

  const handleDelete = async (plan: ServicePlan) => {
    await fetch(`/api/servicios/${plan.id}`, { method: 'DELETE' })
    setShowDeleteConfirm(null); fetchPlans()
  }

  const handleAssign = async () => {
    if (!showAssign || !assignClientId) return
    if (showAssign.modalidad === 'OCASIONAL') {
      setShowAssign(null); setAssignClientId('')
      router.push(`/proyectos/nuevo?clientId=${assignClientId}&serviceId=${showAssign.id}`)
      return
    }
    setAssignLoading(true)
    await fetch(`/api/clientes/${assignClientId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servicePlanId: showAssign.id }) })
    setAssignLoading(false); setShowAssign(null); setAssignClientId('')
  }

  const filtered = showInactive ? plans : plans.filter((p) => p.activo)

  const ModalWrapper = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Catálogo</span>
        </div>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Servicios</h1>
            <p className="text-phm-gray-soft text-sm mt-1">
              {filtered.length} plan{filtered.length !== 1 ? 'es' : ''} disponible{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-phm-gray cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-4 h-4 rounded accent-phm-red" />
              Mostrar inactivos
            </label>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Nueva opción
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-1 bg-phm-surface border border-phm-border-soft rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === t.key ? 'bg-phm-charcoal text-white border border-phm-border-soft' : 'text-phm-gray-soft hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 skeleton-shimmer rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <PremiumCard padding="md" className="text-center">
          <p className="text-phm-gray-soft text-sm py-8">No hay planes en esta categoría.</p>
        </PremiumCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((plan) => (
            <PremiumCard key={plan.id} hover padding="md" className={`flex flex-col gap-4 ${!plan.activo ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLOR[plan.tipo]}`}>
                      {TIPO_LABEL[plan.tipo]}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${plan.modalidad === 'OCASIONAL' ? 'bg-purple-950/60 text-purple-300 border-purple-800/60' : 'bg-blue-950/60 text-blue-300 border-blue-800/60'}`}>
                      {plan.modalidad === 'OCASIONAL' ? 'Ocasional' : 'Mensual'}
                    </span>
                    {!plan.activo && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-phm-border-soft text-phm-gray-soft">Inactivo</span>}
                  </div>
                  <h3 className="font-semibold text-white text-base leading-tight">{plan.nombre}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-phm-gold">${plan.precio}</p>
                  <p className="text-xs text-phm-gray-soft">/ mes</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs text-phm-gray flex-wrap">
                {plan.cantidadReels > 0 && <span className="flex items-center gap-1"><span className="text-purple-400">▶</span> {plan.cantidadReels} reels</span>}
                {plan.cantidadVideosHorizontales > 0 && <span className="flex items-center gap-1"><span className="text-emerald-400">▬</span> {plan.cantidadVideosHorizontales} horiz.</span>}
                {plan.cantidadFotos > 0 && <span className="flex items-center gap-1"><span className="text-amber-400">◆</span> {plan.cantidadFotos} fotos</span>}
                {plan.jornadasGrabacion > 0 && <span className="flex items-center gap-1"><span className="text-blue-400">●</span> {plan.jornadasGrabacion} jornada{plan.jornadasGrabacion !== 1 ? 's' : ''}</span>}
                {plan.duracion && <span className="flex items-center gap-1"><span className="text-phm-gray-soft">◷</span> {plan.duracion}</span>}
                {plan.cantidadImagenesFlyers > 0 && <span className="flex items-center gap-1"><span className="text-pink-400">◈</span> {plan.cantidadImagenesFlyers} imgs/flyers</span>}
              </div>

              {plan.caracteristicas.length > 0 && (
                <ul className="space-y-1">
                  {plan.caracteristicas.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-phm-gray">
                      <span className="text-phm-gold mt-0.5">✓</span> {c}
                    </li>
                  ))}
                </ul>
              )}

              {plan.descripcion && <p className="text-xs text-phm-gray-soft italic">{plan.descripcion}</p>}
              {plan._count && plan._count.clients > 0 && (
                <p className="text-xs text-phm-gray-soft">{plan._count.clients} cliente{plan._count.clients !== 1 ? 's' : ''} asignado{plan._count.clients !== 1 ? 's' : ''}</p>
              )}

              <div className="flex gap-2 flex-wrap pt-3 border-t border-phm-border-soft mt-auto">
                <button onClick={() => openEdit(plan)} className="flex-1 py-1.5 text-xs font-medium text-phm-gray hover:text-white bg-phm-surface border border-phm-border-soft hover:border-phm-gold/40 rounded-md transition-all">Editar</button>
                <button onClick={() => setShowDeactivate(plan)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all border ${plan.activo ? 'text-amber-300 bg-amber-950/40 border-amber-800/50 hover:bg-amber-950/70' : 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50 hover:bg-emerald-950/70'}`}>
                  {plan.activo ? 'Desactivar' : 'Activar'}
                </button>
                {!plan.esDefault && (
                  <button onClick={() => setShowDeleteConfirm(plan)} className="py-1.5 px-3 text-xs font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-md transition-all">Eliminar</button>
                )}
                <button onClick={() => { setShowAssign(plan); setAssignClientId('') }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-md transition-all mt-1">
                  <UserPlus className="w-3.5 h-3.5" /> + Asignar a cliente
                </button>
              </div>
            </PremiumCard>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showForm && (
        <ModalWrapper onClose={() => setShowForm(false)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-phm-border-soft sticky top-0 bg-phm-charcoal z-10">
              <h2 className="font-semibold text-white">{editingPlan ? `Editar: ${editingPlan.nombre}` : 'Nueva opción personalizada'}</h2>
              <button onClick={() => setShowForm(false)} className="text-phm-gray-soft hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleFormChange} required placeholder="Ej: Plan Básico Redes" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleFormChange} className={selectCls}>
                    <option value="CONTENIDO">Contenido</option>
                    <option value="IA">IA</option>
                    <option value="FOTOGRAFIA">Fotografía</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Modalidad *</label>
                  <select name="modalidad" value={form.modalidad} onChange={handleFormChange} className={selectCls}>
                    <option value="MENSUAL">Mensual (plan recurrente)</option>
                    <option value="OCASIONAL">Ocasional / Proyecto único</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Precio ($) *</label>
                  <input name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleFormChange} required placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cantidad de reels</label>
                  <input name="cantidadReels" type="number" min="0" value={form.cantidadReels} onChange={handleFormChange} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Videos horizontales</label>
                  <input name="cantidadVideosHorizontales" type="number" min="0" value={form.cantidadVideosHorizontales} onChange={handleFormChange} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cantidad de fotos</label>
                  <input name="cantidadFotos" type="number" min="0" value={form.cantidadFotos} onChange={handleFormChange} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Jornadas de grabación</label>
                  <input name="jornadasGrabacion" type="number" min="0" value={form.jornadasGrabacion} onChange={handleFormChange} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Duración</label>
                  <input name="duracion" value={form.duracion} onChange={handleFormChange} placeholder="Ej: 1h 30min" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Imágenes o flyers</label>
                  <input name="cantidadImagenesFlyers" type="number" min="0" value={form.cantidadImagenesFlyers} onChange={handleFormChange} placeholder="0" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Características <span className="text-phm-gray-soft">(una por línea)</span></label>
                  <textarea name="caracteristicas" value={form.caracteristicas} onChange={handleFormChange} rows={4}
                    placeholder={'Edición profesional\nSubtítulos estilizados\nGuiones personalizados'}
                    className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Observaciones</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleFormChange} rows={2}
                    placeholder="Notas adicionales..."
                    className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
                </div>
              </div>
              {formError && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
                  {formLoading ? 'Guardando...' : editingPlan ? 'Guardar cambios' : 'Crear plan'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </ModalWrapper>
      )}

      {/* Modal Asignar */}
      {showAssign && (
        <ModalWrapper onClose={() => setShowAssign(null)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-white mb-1">{showAssign.modalidad === 'OCASIONAL' ? 'Crear proyecto para cliente' : 'Asignar a cliente'}</h2>
            <p className="text-xs text-phm-gray-soft mb-1">Servicio: <span className="text-white">{showAssign.nombre}</span></p>
            {showAssign.modalidad === 'OCASIONAL' && (
              <p className="text-xs text-amber-300 mb-4">Este es un servicio ocasional. Se abrirá el formulario de nuevo proyecto con los entregables pre-cargados.</p>
            )}
            {showAssign.modalidad !== 'OCASIONAL' && <div className="mb-5" />}
            <select value={assignClientId} onChange={(e) => setAssignClientId(e.target.value)} className="w-full px-3 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors">
              <option value="">Selecciona un cliente...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
            </select>
            <div className="flex gap-3 mt-5">
              <button onClick={handleAssign} disabled={!assignClientId || assignLoading}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
                {assignLoading ? 'Procesando...' : showAssign.modalidad === 'OCASIONAL' ? 'Crear proyecto →' : 'Asignar'}
              </button>
              <button onClick={() => setShowAssign(null)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Modal Desactivar */}
      {showDeactivate && (
        <ModalWrapper onClose={() => setShowDeactivate(null)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-white mb-2">{showDeactivate.activo ? '¿Desactivar plan?' : '¿Activar plan?'}</h2>
            <p className="text-sm text-phm-gray mb-5">
              {showDeactivate.activo
                ? `"${showDeactivate.nombre}" dejará de aparecer como opción disponible.`
                : `"${showDeactivate.nombre}" volverá a aparecer como opción disponible.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleToggleActive(showDeactivate)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors ${showDeactivate.activo ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-600'}`}>
                {showDeactivate.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => setShowDeactivate(null)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Modal Eliminar */}
      {showDeleteConfirm && (
        <ModalWrapper onClose={() => setShowDeleteConfirm(null)}>
          <div className="relative bg-phm-charcoal border border-phm-border-soft rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-white mb-2">¿Eliminar plan?</h2>
            <p className="text-sm text-phm-gray mb-5">
              Se eliminará <strong className="text-white">"{showDeleteConfirm.nombre}"</strong> permanentemente. Los clientes asignados quedarán sin plan asignado.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white bg-phm-red hover:bg-phm-red-hover transition-colors">Eliminar</button>
              <button onClick={() => setShowDeleteConfirm(null)} className="px-5 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:bg-white/[0.06] rounded-lg transition-all">Cancelar</button>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  )
}
