'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type ContentType = 'REEL' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER' | 'EXTRA'
type ContentStatus = 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADO' | 'PUBLICADO'

interface Content {
  id: string
  clientId: string
  planId: string | null
  type: ContentType
  title: string
  status: ContentStatus
  requierePublicacion: boolean
  driveLink: string | null
  publishedLink: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  observations: string | null
  ultimaActualizacionMetricas: string | null
  client: { id: string; name: string; business: string }
  plan: { id: string; month: number; year: number } | null
}

const TIPO_LABEL: Record<ContentType, string> = {
  REEL: 'Reel',
  VIDEO_HORIZONTAL: 'Video horizontal',
  FOTO: 'Foto',
  IMAGEN_FLYER: 'Imagen / Flyer',
  EXTRA: 'Extra',
}

const TIPO_COLOR: Record<ContentType, string> = {
  REEL: 'bg-purple-950 text-purple-300 border-purple-800',
  VIDEO_HORIZONTAL: 'bg-blue-950 text-blue-300 border-blue-800',
  FOTO: 'bg-amber-950 text-amber-300 border-amber-800',
  IMAGEN_FLYER: 'bg-green-950 text-green-300 border-green-800',
  EXTRA: 'bg-zinc-800 text-zinc-300 border-zinc-700',
}

const STATUS_LABEL: Record<ContentStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  ENTREGADO: 'Entregado',
  PUBLICADO: 'Publicado',
}

const STATUS_COLOR: Record<ContentStatus, string> = {
  PENDIENTE: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  EN_PROCESO: 'bg-amber-950 text-amber-400 border-amber-800',
  ENTREGADO: 'bg-blue-950 text-blue-400 border-blue-800',
  PUBLICADO: 'bg-purple-950 text-purple-400 border-purple-800',
}

const EMPTY_FORM = {
  clientId: '', planId: '', type: 'REEL' as ContentType,
  title: '', status: 'PENDIENTE' as ContentStatus,
  requierePublicacion: true, driveLink: '', publishedLink: '', observations: '',
}

function defaultRequiere(type: ContentType) { return type === 'REEL' }

function fmtNum(n: number) { return (n || 0).toLocaleString('es-MX') }

function ContenidosPageInner() {
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get('clienteId') || ''

  const [contents, setContents] = useState<Content[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [formPlans, setFormPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [filters, setFilters] = useState({ clientId: clienteIdParam, type: '', status: '' })

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [showLinks, setShowLinks] = useState<Content | null>(null)
  const [linksForm, setLinksForm] = useState({ driveLink: '', publishedLink: '' })
  const [savingLinks, setSavingLinks] = useState(false)

  const [showMetricas, setShowMetricas] = useState<Content | null>(null)
  const [metricasForm, setMetricasForm] = useState({ views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0 })
  const [savingMetricas, setSavingMetricas] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setUserRole(d.role) })
    fetch('/api/clientes').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    if (!form.clientId) { setFormPlans([]); return }
    fetch(`/api/planes?clientId=${form.clientId}`)
      .then(r => r.json())
      .then(d => setFormPlans(Array.isArray(d) ? d : []))
      .catch(() => setFormPlans([]))
  }, [form.clientId])

  const fetchContents = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.clientId) params.set('clientId', filters.clientId)
    if (filters.type) params.set('type', filters.type)
    if (filters.status) params.set('status', filters.status)
    setLoading(true)
    fetch(`/api/contenidos?${params}`)
      .then(r => r.json())
      .then(d => setContents(Array.isArray(d) ? d : []))
      .catch(() => setContents([]))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { fetchContents() }, [fetchContents])

  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'PRODUCCION'].includes(userRole)
  const canDelete = userRole === 'SUPER_ADMIN'
  const canGenerate = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  // --- Quick estado ---
  const handleEstado = async (id: string, status: ContentStatus) => {
    await fetch(`/api/contenidos/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchContents()
  }

  // --- Links ---
  const openLinks = (c: Content) => {
    setLinksForm({ driveLink: c.driveLink || '', publishedLink: c.publishedLink || '' })
    setShowLinks(c)
  }
  const saveLinks = async () => {
    if (!showLinks) return
    setSavingLinks(true)
    await fetch(`/api/contenidos/${showLinks.id}/links`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linksForm),
    })
    setSavingLinks(false)
    setShowLinks(null)
    fetchContents()
  }

  // --- Métricas ---
  const openMetricas = (c: Content) => {
    setMetricasForm({ views: c.views, likes: c.likes, comments: c.comments, shares: c.shares, saves: c.saves, reach: c.reach, impressions: c.impressions })
    setShowMetricas(c)
  }
  const saveMetricas = async () => {
    if (!showMetricas) return
    setSavingMetricas(true)
    await fetch(`/api/contenidos/${showMetricas.id}/metricas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metricasForm),
    })
    setSavingMetricas(false)
    setShowMetricas(null)
    fetchContents()
  }

  // --- Crear ---
  const handleFormTypeChange = (type: ContentType) => {
    setForm(p => ({ ...p, type, requierePublicacion: defaultRequiere(type) }))
  }
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/contenidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planId: form.planId || null }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm(EMPTY_FORM)
        fetchContents()
      } else {
        const d = await res.json()
        setFormError(d.error || 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  // --- Eliminar ---
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/contenidos/${deleteId}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteId(null)
    fetchContents()
  }

  const deletingContent = contents.find(c => c.id === deleteId)

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Contenidos</h1>
          <p className="text-zinc-500 text-sm">{contents.length} entregable{contents.length !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && (
          <button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#8B0000' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo entregable
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filters.clientId} onChange={e => setFilters(p => ({ ...p, clientId: e.target.value }))}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los tipos</option>
          {(Object.keys(TIPO_LABEL) as ContentType[]).map(k => <option key={k} value={k}>{TIPO_LABEL[k]}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as ContentStatus[]).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        {(filters.clientId || filters.type || filters.status) && (
          <button onClick={() => setFilters({ clientId: '', type: '', status: '' })}
            className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-zinc-500 text-sm">No hay entregables registrados.</p>
            {canWrite && (
              <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#8B0000' }}>
                Crear entregable
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Título</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Estado</th>
                  <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Drive</th>
                  <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Publicación</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Métricas</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {contents.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                    {/* Cliente */}
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 font-medium leading-tight">{c.client?.name}</p>
                      <p className="text-zinc-500 text-xs">{c.client?.business}</p>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLOR[c.type]}`}>
                        {TIPO_LABEL[c.type]}
                      </span>
                    </td>

                    {/* Título */}
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 max-w-[180px] truncate">{c.title}</p>
                      {c.plan && <p className="text-zinc-500 text-xs">{MESES[c.plan.month - 1]} {c.plan.year}</p>}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      {canWrite ? (
                        <select
                          value={c.status}
                          onChange={e => handleEstado(c.id, e.target.value as ContentStatus)}
                          className={`text-xs font-medium px-2 py-1 rounded border bg-transparent cursor-pointer focus:outline-none ${STATUS_COLOR[c.status]}`}
                        >
                          {(Object.keys(STATUS_LABEL) as ContentStatus[]).map(s => (
                            <option key={s} value={s} className="bg-zinc-900 text-zinc-200">{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLOR[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      )}
                    </td>

                    {/* Drive */}
                    <td className="px-4 py-3 text-center">
                      {c.driveLink ? (
                        <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-green-950 text-green-400 hover:bg-green-900 transition-colors" title="Ver en Drive">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Publicación */}
                    <td className="px-4 py-3 text-center">
                      {!c.requierePublicacion ? (
                        <span className="text-zinc-600 text-xs">No aplica</span>
                      ) : c.publishedLink ? (
                        <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-purple-950 text-purple-400 hover:bg-purple-900 transition-colors" title="Ver publicación">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs">Sin link</span>
                      )}
                    </td>

                    {/* Métricas */}
                    <td className="px-4 py-3">
                      {!c.requierePublicacion ? (
                        <span className="text-xs text-zinc-600">No requiere publicación</span>
                      ) : !c.publishedLink ? (
                        <span className="text-xs text-zinc-600">Sin publicación</span>
                      ) : (
                        <div className="flex gap-3 text-xs text-zinc-400">
                          <span title="Views">👁 {fmtNum(c.views)}</span>
                          <span title="Likes">❤ {fmtNum(c.likes)}</span>
                          <span title="Comentarios">💬 {fmtNum(c.comments)}</span>
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {canWrite && (
                          <button onClick={() => openLinks(c)}
                            className="px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all" title="Agregar links">
                            Links
                          </button>
                        )}
                        {canWrite && c.requierePublicacion && c.publishedLink && (
                          <button onClick={() => openMetricas(c)}
                            className="px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all">
                            Métricas
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteId(c.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-md transition-all">
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

      {/* ── MODAL NUEVO ENTREGABLE ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h2 className="font-semibold text-zinc-100">Nuevo entregable</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cliente *</label>
                <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value, planId: '' }))} required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                  <option value="">Selecciona cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
                </select>
              </div>
              {form.clientId && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plan mensual (opcional)</label>
                  {formPlans.length === 0 ? (
                    <p className="text-xs text-zinc-600 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      Sin planes para este cliente
                    </p>
                  ) : (
                    <select value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                      <option value="">Sin plan asociado</option>
                      {formPlans.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {MESES[p.month - 1]} {p.year}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo *</label>
                  <select value={form.type} onChange={e => handleFormTypeChange(e.target.value as ContentType)} required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    {(Object.keys(TIPO_LABEL) as ContentType[]).map(k => (
                      <option key={k} value={k}>{TIPO_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Estado</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ContentStatus }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                    {(Object.keys(STATUS_LABEL) as ContentStatus[]).map(k => (
                      <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                  placeholder="Ej: Reel de lanzamiento"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Link de Drive</label>
                <input type="url" value={form.driveLink} onChange={e => setForm(p => ({ ...p, driveLink: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <input type="checkbox" id="reqPub" checked={form.requierePublicacion}
                  onChange={e => setForm(p => ({ ...p, requierePublicacion: e.target.checked }))}
                  className="w-4 h-4 accent-red-700" />
                <label htmlFor="reqPub" className="text-sm text-zinc-300 cursor-pointer">Requiere publicación en redes</label>
              </div>
              {form.requierePublicacion && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Link publicado</label>
                  <input type="url" value={form.publishedLink} onChange={e => setForm(p => ({ ...p, publishedLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Observaciones</label>
                <textarea value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
              </div>
              {formError && <div className="px-3 py-2 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-all"
                  style={{ backgroundColor: '#8B0000' }}>
                  {saving ? 'Guardando...' : 'Crear entregable'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL LINKS ── */}
      {showLinks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLinks(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="font-semibold text-zinc-100">Links — {showLinks.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{showLinks.client?.name}</p>
              </div>
              <button onClick={() => setShowLinks(null)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Link de Drive</label>
                <input type="url" value={linksForm.driveLink} onChange={e => setLinksForm(p => ({ ...p, driveLink: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                <p className="text-xs text-zinc-600 mt-1">Agregar link = pasar a "En proceso" si estaba pendiente</p>
              </div>
              {showLinks.requierePublicacion && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Link publicado</label>
                  <input type="url" value={linksForm.publishedLink} onChange={e => setLinksForm(p => ({ ...p, publishedLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                  <p className="text-xs text-zinc-600 mt-1">Agregar link publicado = pasar automáticamente a "Publicado"</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={saveLinks} disabled={savingLinks}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#8B0000' }}>
                  {savingLinks ? 'Guardando...' : 'Guardar links'}
                </button>
                <button onClick={() => setShowLinks(null)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MÉTRICAS ── */}
      {showMetricas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMetricas(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <h2 className="font-semibold text-zinc-100">Métricas — {showMetricas.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Actualización manual</p>
              </div>
              <button onClick={() => setShowMetricas(null)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'views', label: 'Views' },
                  { key: 'likes', label: 'Likes' },
                  { key: 'comments', label: 'Comentarios' },
                  { key: 'shares', label: 'Compartidos' },
                  { key: 'saves', label: 'Guardados' },
                  { key: 'reach', label: 'Alcance' },
                  { key: 'impressions', label: 'Impresiones' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
                    <input type="number" min={0}
                      value={(metricasForm as any)[key]}
                      onChange={e => setMetricasForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={saveMetricas} disabled={savingMetricas}
                  className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#8B0000' }}>
                  {savingMetricas ? 'Guardando...' : 'Actualizar métricas'}
                </button>
                <button onClick={() => setShowMetricas(null)}
                  className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-semibold text-zinc-100 mb-2">¿Eliminar entregable?</h2>
            <p className="text-sm text-zinc-400 mb-5">
              Se eliminará <strong className="text-zinc-200">{deletingContent?.title}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white bg-red-800 hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button onClick={() => setDeleteId(null)}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContenidosPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>}>
      <ContenidosPageInner />
    </Suspense>
  )
}
