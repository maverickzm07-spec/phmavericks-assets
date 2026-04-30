'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import { getMonthName } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'FOTO', label: 'Foto' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'OTRO', label: 'Otro' },
]

const FORMATOS = [
  { value: '', label: 'Sin formato' },
  { value: 'VERTICAL_9_16', label: 'Vertical 9:16' },
  { value: 'HORIZONTAL_16_9', label: 'Horizontal 16:9' },
  { value: 'CUADRADO_1_1', label: 'Cuadrado 1:1' },
  { value: 'NO_APLICA', label: 'No aplica' },
]

function NuevoContenidoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [clients, setClients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    planId: searchParams.get('planId') || '',
    projectId: searchParams.get('projectId') || '',
    type: 'VIDEO',
    formato: '',
    title: '',
    status: 'PENDING',
    driveLink: '',
    publishedLink: '',
    publishedAt: '',
    views: 0, likes: 0, comments: 0, shares: 0, saves: 0,
    observations: '',
  })

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.clientId) {
      fetch(`/api/planes?clientId=${form.clientId}`).then((r) => r.ok ? r.json() : []).then((d) => setPlans(Array.isArray(d) ? d : [])).catch(() => setPlans([]))
      fetch(`/api/proyectos?clientId=${form.clientId}`).then((r) => r.ok ? r.json() : []).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => setProjects([]))
    } else { setPlans([]); setProjects([]) }
  }, [form.clientId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
      ...(name === 'clientId' ? { planId: '', projectId: '' } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/contenidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planId: form.planId || null, projectId: form.projectId || null, formato: form.formato || null }),
      })
      if (res.ok) { router.push(form.projectId ? `/proyectos/${form.projectId}` : '/contenidos') }
      else { const data = await res.json(); setError(data.error || 'Error al crear el contenido') }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contenidos" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Contenido</h1>
          <p className="text-phm-gray-soft text-sm">Registra un entregable</p>
        </div>
      </div>

      <PremiumCard padding="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Cliente *</label>
            <select name="clientId" value={form.clientId} onChange={handleChange} required className={selectCls}>
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Proyecto <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
              <select name="projectId" value={form.projectId} onChange={handleChange} disabled={!form.clientId}
                className={`${selectCls} disabled:opacity-40`}>
                <option value="">{!form.clientId ? 'Selecciona cliente primero' : 'Sin proyecto'}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Plan mensual <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
              <select name="planId" value={form.planId} onChange={handleChange} disabled={!form.clientId}
                className={`${selectCls} disabled:opacity-40`}>
                <option value="">{!form.clientId ? 'Selecciona cliente primero' : 'Sin plan mensual'}</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{getMonthName(p.month)} {p.year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo *</label>
              <select name="type" value={form.type} onChange={handleChange} className={selectCls}>
                {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Formato</label>
              <select name="formato" value={form.formato} onChange={handleChange} className={selectCls}>
                {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Título *</label>
              <input name="title" value={form.title} onChange={handleChange} required
                placeholder="Ej: Video vacacional — corte vertical" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="status" value={form.status} onChange={handleChange} className={selectCls}>
                <option value="PENDING">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="EDITING">En Edición</option>
                <option value="APPROVED">Aprobado</option>
                <option value="ENTREGADO">Entregado</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="COMPLETED">Completado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Link de Drive / entrega</label>
              <input name="driveLink" value={form.driveLink} onChange={handleChange} type="url"
                placeholder="https://drive.google.com/..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Link publicado</label>
              <input name="publishedLink" value={form.publishedLink} onChange={handleChange} type="url"
                placeholder="https://www.instagram.com/..." className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Fecha de publicación</label>
            <input name="publishedAt" value={form.publishedAt} onChange={handleChange} type="date"
              className="px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors" />
          </div>

          <div>
            <label className={labelCls}>Métricas <span className="text-phm-gray-soft font-normal">(opcional, para contenidos de redes)</span></label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { name: 'views', label: 'Views', color: 'text-white' },
                { name: 'likes', label: 'Likes', color: 'text-red-400' },
                { name: 'comments', label: 'Comentarios', color: 'text-blue-400' },
                { name: 'shares', label: 'Compartidos', color: 'text-emerald-400' },
                { name: 'saves', label: 'Guardados', color: 'text-phm-gold' },
              ].map((field) => (
                <div key={field.name} className="bg-phm-surface border border-phm-border-soft rounded-lg p-3">
                  <label className={`block text-xs mb-1.5 text-center ${field.color}`}>{field.label}</label>
                  <input name={field.name} type="number" min="0" value={(form as any)[field.name]} onChange={handleChange}
                    className="w-full px-2 py-1.5 bg-phm-charcoal border border-phm-border-soft rounded text-white text-sm text-center focus:outline-none focus:border-phm-gold/40" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={2}
              className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Contenido'}
            </button>
            <Link href="/contenidos"
              className="px-6 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:border-phm-gold/40 rounded-lg transition-all text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </PremiumCard>
    </div>
  )
}

export default function NuevoContenidoPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <div className="h-96 skeleton-shimmer rounded-2xl" />
      </div>
    }>
      <NuevoContenidoForm />
    </Suspense>
  )
}
