'use client'

import { useState, useEffect } from 'react'

type PlanType = 'CONTENIDO' | 'IA' | 'FOTOGRAFIA' | 'PERSONALIZADO'

interface ServicePlan {
  id: string
  nombre: string
  tipo: PlanType
  precio: number
  cantidadReels: number
  cantidadFotos: number
  jornadasGrabacion: number
  duracion: string | null
  vestuarios: number
  descripcion: string | null
  caracteristicas: string[]
  esDefault: boolean
  activo: boolean
  _count?: { clients: number }
}

interface Client {
  id: string
  name: string
  business: string
}

const TIPO_LABEL: Record<PlanType, string> = {
  CONTENIDO: 'Contenido',
  IA: 'IA',
  FOTOGRAFIA: 'Fotografía',
  PERSONALIZADO: 'Personalizado',
}

const TIPO_COLOR: Record<PlanType, string> = {
  CONTENIDO: 'bg-purple-950 text-purple-300 border-purple-800',
  IA: 'bg-blue-950 text-blue-300 border-blue-800',
  FOTOGRAFIA: 'bg-amber-950 text-amber-300 border-amber-800',
  PERSONALIZADO: 'bg-zinc-800 text-zinc-300 border-zinc-700',
}

const TABS = [
  { key: '', label: 'Todos' },
  { key: 'CONTENIDO', label: 'Contenido' },
  { key: 'IA', label: 'IA' },
  { key: 'FOTOGRAFIA', label: 'Fotografía' },
  { key: 'PERSONALIZADO', label: 'Personalizados' },
]

const EMPTY_FORM = {
  nombre: '',
  tipo: 'PERSONALIZADO' as PlanType,
  precio: '',
  cantidadReels: '',
  cantidadFotos: '',
  jornadasGrabacion: '',
  duracion: '',
  vestuarios: '',
  descripcion: '',
  caracteristicas: '',
}

export default function ServiciosPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modales
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [showAssign, setShowAssign] = useState<ServicePlan | null>(null)
  const [showDeactivate, setShowDeactivate] = useState<ServicePlan | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<ServicePlan | null>(null)

  // Form state
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Assign state
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
    fetch('/api/clientes')
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => setClients([]))
  }, [])

  const openCreate = () => {
    setEditingPlan(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (plan: ServicePlan) => {
    setEditingPlan(plan)
    setForm({
      nombre: plan.nombre,
      tipo: plan.tipo,
      precio: plan.precio.toString(),
      cantidadReels: plan.cantidadReels.toString(),
      cantidadFotos: plan.cantidadFotos.toString(),
      jornadasGrabacion: plan.jornadasGrabacion.toString(),
      duracion: plan.duracion || '',
      vestuarios: plan.vestuarios.toString(),
      descripcion: plan.descripcion || '',
      caracteristicas: plan.caracteristicas.join('\n'),
    })
    setFormError('')
    setShowForm(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')

    const precio = parseFloat(form.precio)
    if (isNaN(precio) || precio <= 0) {
      setFormError('El precio debe ser un número positivo')
      setFormLoading(false)
      return
    }

    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      precio,
      cantidadReels: parseInt(form.cantidadReels) || 0,
      cantidadFotos: parseInt(form.cantidadFotos) || 0,
      jornadasGrabacion: parseInt(form.jornadasGrabacion) || 0,
      duracion: form.duracion.trim() || undefined,
      vestuarios: parseInt(form.vestuarios) || 0,
      descripcion: form.descripcion.trim() || undefined,
      caracteristicas: form.caracteristicas.split('\n').map((s) => s.trim()).filter(Boolean),
    }

    try {
      const url = editingPlan ? `/api/servicios/${editingPlan.id}` : '/api/servicios'
      const method = editingPlan ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowForm(false)
        fetchPlans()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Error al guardar')
      }
    } catch {
      setFormError('Error de conexión')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (plan: ServicePlan) => {
    await fetch(`/api/servicios/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !plan.activo }),
    })
    setShowDeactivate(null)
    fetchPlans()
  }

  const handleDelete = async (plan: ServicePlan) => {
    await fetch(`/api/servicios/${plan.id}`, { method: 'DELETE' })
    setShowDeleteConfirm(null)
    fetchPlans()
  }

  const handleAssign = async () => {
    if (!showAssign || !assignClientId) return
    setAssignLoading(true)
    await fetch(`/api/clientes/${assignClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicePlanId: showAssign.id }),
    })
    setAssignLoading(false)
    setShowAssign(null)
    setAssignClientId('')
  }

  const filtered = showInactive ? plans : plans.filter((p) => p.activo)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Servicios</h1>
          <p className="text-zinc-500 text-sm">{filtered.length} plan{filtered.length !== 1 ? 'es' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded accent-red-700"
            />
            Mostrar inactivos
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#8B0000' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva opción personalizada
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              tab === t.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="text-center text-zinc-500 text-sm py-16">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-500 text-sm py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          No hay planes en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((plan) => (
            <div
              key={plan.id}
              className={`bg-zinc-900 border rounded-xl p-5 flex flex-col gap-4 transition-all ${
                plan.activo ? 'border-zinc-800' : 'border-zinc-800/40 opacity-60'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLOR[plan.tipo]}`}>
                      {TIPO_LABEL[plan.tipo]}
                    </span>
                    {!plan.activo && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-zinc-700 text-zinc-500 bg-zinc-800">
                        Inactivo
                      </span>
                    )}
                    {plan.esDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-zinc-700 text-zinc-500">
                        Default
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-zinc-100 text-base leading-tight">{plan.nombre}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-white">${plan.precio}</p>
                  <p className="text-xs text-zinc-500">/ mes</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-3 text-xs text-zinc-400 flex-wrap">
                {plan.cantidadReels > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-purple-400">▶</span> {plan.cantidadReels} reels
                  </span>
                )}
                {plan.cantidadFotos > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-400">◆</span> {plan.cantidadFotos} fotos
                  </span>
                )}
                {plan.jornadasGrabacion > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-blue-400">●</span> {plan.jornadasGrabacion} jornada{plan.jornadasGrabacion !== 1 ? 's' : ''}
                  </span>
                )}
                {plan.duracion && (
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">◷</span> {plan.duracion}
                  </span>
                )}
                {plan.vestuarios > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">◈</span> {plan.vestuarios} vestuario{plan.vestuarios !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Features */}
              {plan.caracteristicas.length > 0 && (
                <ul className="space-y-1">
                  {plan.caracteristicas.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-600 mt-0.5">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              )}

              {plan.descripcion && (
                <p className="text-xs text-zinc-500 italic">{plan.descripcion}</p>
              )}

              {plan._count && plan._count.clients > 0 && (
                <p className="text-xs text-zinc-600">{plan._count.clients} cliente{plan._count.clients !== 1 ? 's' : ''} asignado{plan._count.clients !== 1 ? 's' : ''}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-1 border-t border-zinc-800 mt-auto">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={() => setShowDeactivate(plan)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    plan.activo
                      ? 'text-amber-400 bg-amber-950/40 hover:bg-amber-950'
                      : 'text-green-400 bg-green-950/40 hover:bg-green-950'
                  }`}
                >
                  {plan.activo ? 'Desactivar' : 'Activar'}
                </button>
                {!plan.esDefault && (
                  <button
                    onClick={() => setShowDeleteConfirm(plan)}
                    className="py-1.5 px-3 text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-950 rounded-md transition-all"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  onClick={() => { setShowAssign(plan); setAssignClientId('') }}
                  className="w-full py-1.5 text-xs font-medium text-white rounded-md transition-all mt-1"
                  style={{ backgroundColor: '#8B0000' }}
                >
                  Asignar a cliente
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-zinc-100">
                {editingPlan ? `Editar: ${editingPlan.nombre}` : 'Nueva opción personalizada'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleFormChange}
                    required
                    placeholder="Ej: Plan Básico Redes"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo *</label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500"
                  >
                    <option value="CONTENIDO">Contenido</option>
                    <option value="IA">IA</option>
                    <option value="FOTOGRAFIA">Fotografía</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Precio ($) *</label>
                  <input
                    name="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio}
                    onChange={handleFormChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cantidad de reels</label>
                  <input
                    name="cantidadReels"
                    type="number"
                    min="0"
                    value={form.cantidadReels}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cantidad de fotos</label>
                  <input
                    name="cantidadFotos"
                    type="number"
                    min="0"
                    value={form.cantidadFotos}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Jornadas de grabación</label>
                  <input
                    name="jornadasGrabacion"
                    type="number"
                    min="0"
                    value={form.jornadasGrabacion}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duración</label>
                  <input
                    name="duracion"
                    value={form.duracion}
                    onChange={handleFormChange}
                    placeholder="Ej: 1h 30min"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Vestuarios</label>
                  <input
                    name="vestuarios"
                    type="number"
                    min="0"
                    value={form.vestuarios}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Características <span className="text-zinc-600">(una por línea)</span>
                  </label>
                  <textarea
                    name="caracteristicas"
                    value={form.caracteristicas}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder={'Edición profesional\nSubtítulos estilizados\nGuiones personalizados'}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Observaciones</label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleFormChange}
                    rows={2}
                    placeholder="Notas adicionales sobre este plan..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{formError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#8B0000' }}
                >
                  {formLoading ? 'Guardando...' : editingPlan ? 'Guardar cambios' : 'Crear plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL ASIGNAR A CLIENTE ── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssign(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-zinc-100 mb-1">Asignar a cliente</h2>
            <p className="text-xs text-zinc-500 mb-5">Plan: <span className="text-zinc-300">{showAssign.nombre}</span></p>

            <div className="space-y-3">
              <select
                value={assignClientId}
                onChange={(e) => setAssignClientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500"
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.business}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAssign}
                disabled={!assignClientId || assignLoading}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#8B0000' }}
              >
                {assignLoading ? 'Asignando...' : 'Asignar'}
              </button>
              <button
                onClick={() => setShowAssign(null)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESACTIVAR / ACTIVAR ── */}
      {showDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeactivate(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-zinc-100 mb-2">
              {showDeactivate.activo ? '¿Desactivar plan?' : '¿Activar plan?'}
            </h2>
            <p className="text-sm text-zinc-400 mb-5">
              {showDeactivate.activo
                ? `"${showDeactivate.nombre}" dejará de aparecer como opción disponible. Los clientes ya asignados no se ven afectados.`
                : `"${showDeactivate.nombre}" volverá a aparecer como opción disponible.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleToggleActive(showDeactivate)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg text-white ${
                  showDeactivate.activo ? 'bg-amber-700 hover:bg-amber-600' : 'bg-green-700 hover:bg-green-600'
                }`}
              >
                {showDeactivate.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => setShowDeactivate(null)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-zinc-100 mb-2">¿Eliminar plan?</h2>
            <p className="text-sm text-zinc-400 mb-5">
              Se eliminará <strong className="text-zinc-200">"{showDeleteConfirm.nombre}"</strong> permanentemente. Los clientes asignados quedarán sin plan asignado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white bg-red-800 hover:bg-red-700"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
