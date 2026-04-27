'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getMonthName } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'FOTO', label: 'Foto' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'REEL', label: 'Reel' },
  { value: 'VIDEO_HORIZONTAL', label: 'Video Horizontal' },
  { value: 'IMAGEN_FLYER', label: 'Imagen/Flyer' },
  { value: 'EXTRA', label: 'Extra' },
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
      fetch(`/api/planes?clientId=${form.clientId}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setPlans(Array.isArray(d) ? d : []))
        .catch(() => setPlans([]))
      fetch(`/api/proyectos?clientId=${form.clientId}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setProjects(Array.isArray(d) ? d : []))
        .catch(() => setProjects([]))
    } else {
      setPlans([])
      setProjects([])
    }
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
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contenidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          planId: form.planId || null,
          projectId: form.projectId || null,
          formato: form.formato || null,
        }),
      })
      if (res.ok) {
        const dest = form.projectId ? `/proyectos/${form.projectId}` : '/contenidos'
        router.push(dest)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear el contenido')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contenidos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nuevo Contenido</h1>
          <p className="text-zinc-500 text-sm">Registra un entregable</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente *</label>
            <select name="clientId" value={form.clientId} onChange={handleChange} required
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
            </select>
          </div>

          {/* Proyecto y Plan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Proyecto <span className="text-zinc-500 font-normal">(opcional)</span>
              </label>
              <select name="projectId" value={form.projectId} onChange={handleChange}
                disabled={!form.clientId}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-40">
                <option value="">{!form.clientId ? 'Selecciona cliente primero' : 'Sin proyecto'}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Plan mensual <span className="text-zinc-500 font-normal">(opcional)</span>
              </label>
              <select name="planId" value={form.planId} onChange={handleChange}
                disabled={!form.clientId}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-40">
                <option value="">{!form.clientId ? 'Selecciona cliente primero' : 'Sin plan mensual'}</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{getMonthName(p.month)} {p.year}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo y Formato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo *</label>
              <select name="type" value={form.type} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Formato</label>
              <select name="formato" value={form.formato} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título *</label>
              <input name="title" value={form.title} onChange={handleChange} required
                placeholder="Ej: Video vacacional — corte vertical"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
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

          {/* Links */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link de Drive / entrega</label>
              <input name="driveLink" value={form.driveLink} onChange={handleChange} type="url"
                placeholder="https://drive.google.com/..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link publicado</label>
              <input name="publishedLink" value={form.publishedLink} onChange={handleChange} type="url"
                placeholder="https://www.instagram.com/..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Fecha de publicación</label>
            <input name="publishedAt" value={form.publishedAt} onChange={handleChange} type="date"
              className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          {/* Métricas */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Métricas <span className="text-zinc-500 font-normal">(opcional, para contenidos de redes)</span></label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { name: 'views', label: 'Views', icon: '👁' },
                { name: 'likes', label: 'Likes', icon: '❤️' },
                { name: 'comments', label: 'Comentarios', icon: '💬' },
                { name: 'shares', label: 'Compartidos', icon: '↗️' },
                { name: 'saves', label: 'Guardados', icon: '🔖' },
              ].map((field) => (
                <div key={field.name} className="bg-zinc-800/50 rounded-lg p-3">
                  <label className="block text-xs text-zinc-500 mb-1.5 text-center">{field.icon} {field.label}</label>
                  <input name={field.name} type="number" min="0" value={(form as any)[field.name]} onChange={handleChange}
                    className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm text-center focus:outline-none focus:border-zinc-500" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#8B0000' }}>
              {loading ? 'Guardando...' : 'Guardar Contenido'}
            </button>
            <Link href="/contenidos"
              className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NuevoContenidoPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>}>
      <NuevoContenidoForm />
    </Suspense>
  )
}
