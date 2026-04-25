'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { contentStatusBadge, contentTypeBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { getMonthName, formatNumber } from '@/lib/utils'

export default function ContenidoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [content, setContent] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    Promise.all([
      fetch(`/api/contenidos/${id}`).then((r) => r.json()),
      fetch('/api/clientes').then((r) => r.json()),
    ]).then(([contentData, clientsData]) => {
      setContent(contentData)
      setClients(clientsData)
      const f = {
        clientId: contentData.clientId,
        planId: contentData.planId,
        type: contentData.type,
        title: contentData.title,
        status: contentData.status,
        driveLink: contentData.driveLink || '',
        publishedLink: contentData.publishedLink || '',
        publishedAt: contentData.publishedAt ? contentData.publishedAt.split('T')[0] : '',
        views: contentData.views,
        likes: contentData.likes,
        comments: contentData.comments,
        shares: contentData.shares,
        saves: contentData.saves,
        observations: contentData.observations || '',
      }
      setForm(f)
      return fetch(`/api/planes?clientId=${contentData.clientId}`)
    }).then((r) => r.json()).then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
    if (name === 'clientId') {
      fetch(`/api/planes?clientId=${value}`).then((r) => r.json()).then(setPlans)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/contenidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSuccess('Contenido actualizado correctamente')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al actualizar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/contenidos/${id}`, { method: 'DELETE' })
      router.push('/contenidos')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>
  if (!content) return <div className="text-red-400 text-sm py-10 text-center">Contenido no encontrado</div>

  const engagement = content.likes + content.comments + content.shares + content.saves

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contenidos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-50 truncate">{content.title}</h1>
          <p className="text-zinc-500 text-sm">{content.client?.name} — {content.plan ? `${getMonthName(content.plan.month)} ${content.plan.year}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {contentTypeBadge(content.type)}
          {contentStatusBadge(content.status)}
          <button onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      {(content.views > 0 || content.likes > 0) && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Views', value: content.views, icon: '👁', color: 'text-zinc-300' },
            { label: 'Likes', value: content.likes, icon: '❤️', color: 'text-red-400' },
            { label: 'Comentarios', value: content.comments, icon: '💬', color: 'text-blue-400' },
            { label: 'Compartidos', value: content.shares, icon: '↗️', color: 'text-green-400' },
            { label: 'Guardados', value: content.saves, icon: '🔖', color: 'text-yellow-400' },
          ].map((m) => (
            <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className={`text-lg font-bold ${m.color}`}>{formatNumber(m.value)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{m.icon} {m.label}</p>
            </div>
          ))}
        </div>
      )}
      {engagement > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-zinc-500">Engagement total:</span>
          <span className="text-sm font-semibold text-zinc-200">{formatNumber(engagement)}</span>
          <span className="text-xs text-zinc-600">(likes + comentarios + compartidos + guardados)</span>
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold text-zinc-100 mb-5">Editar contenido</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente</label>
              <select name="clientId" value={form.clientId} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Plan mensual</label>
              <select name="planId" value={form.planId} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>{getMonthName(p.month)} {p.year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="REEL">Reel</option>
                <option value="CAROUSEL">Carrusel</option>
                <option value="FLYER">Flyer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="PENDING">Pendiente</option>
                <option value="EDITING">En Edición</option>
                <option value="APPROVED">Aprobado</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="COMPLETED">Completado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título</label>
            <input name="title" value={form.title} onChange={handleChange} required
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link de Drive</label>
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

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Métricas</label>
            <div className="grid grid-cols-5 gap-3">
              {[
                { name: 'views', label: 'Views' },
                { name: 'likes', label: 'Likes' },
                { name: 'comments', label: 'Comentarios' },
                { name: 'shares', label: 'Compartidos' },
                { name: 'saves', label: 'Guardados' },
              ].map((field) => (
                <div key={field.name} className="bg-zinc-800/50 rounded-lg p-3">
                  <label className="block text-xs text-zinc-500 mb-1.5 text-center">{field.label}</label>
                  <input name={field.name} type="number" min="0" value={form[field.name] || 0} onChange={handleChange}
                    className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm text-center focus:outline-none focus:border-zinc-500" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}
          {success && <div className="px-4 py-3 bg-green-950 border border-green-800 rounded-lg text-sm text-green-400">{success}</div>}

          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#8B0000' }}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="¿Eliminar contenido?"
        description={`Se eliminará "${content.title}". Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
