'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { contentStatusBadge, contentTypeBadge } from '@/components/ui/Badge'
import PremiumCard from '@/components/ui/PremiumCard'
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
      setForm({
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
      })
      return fetch(`/api/planes?clientId=${contentData.clientId}`)
    }).then((r) => r.json()).then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev: any) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
    if (name === 'clientId') {
      fetch(`/api/planes?clientId=${value}`).then((r) => r.json()).then(setPlans)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/contenidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { setSuccess('Contenido actualizado correctamente'); setTimeout(() => setSuccess(''), 3000) }
      else { const data = await res.json(); setError(data.error || 'Error al actualizar') }
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await fetch(`/api/contenidos/${id}`, { method: 'DELETE' }); router.push('/contenidos') }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="max-w-3xl space-y-4">
      <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
      <div className="h-32 skeleton-shimmer rounded-2xl" />
      <div className="h-80 skeleton-shimmer rounded-2xl" />
    </div>
  )
  if (!content) return <PremiumCard padding="lg" className="text-center"><p className="text-phm-gray">Contenido no encontrado.</p></PremiumCard>

  const engagement = content.likes + content.comments + content.shares + content.saves
  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contenidos" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{content.title}</h1>
          <p className="text-phm-gray-soft text-sm">{content.client?.name}{content.plan ? ` — ${getMonthName(content.plan.month)} ${content.plan.year}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {contentTypeBadge(content.type)}
          {contentStatusBadge(content.status)}
          <button onClick={() => setShowDelete(true)}
            className="px-3 py-2 text-sm font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </div>

      {/* Métricas actuales */}
      {(content.views > 0 || content.likes > 0) && (
        <>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Views', value: content.views, icon: '👁', color: 'text-white' },
              { label: 'Likes', value: content.likes, icon: '❤️', color: 'text-red-400' },
              { label: 'Comentarios', value: content.comments, icon: '💬', color: 'text-blue-400' },
              { label: 'Compartidos', value: content.shares, icon: '↗️', color: 'text-emerald-400' },
              { label: 'Guardados', value: content.saves, icon: '🔖', color: 'text-phm-gold' },
            ].map((m) => (
              <div key={m.label} className="bg-phm-surface border border-phm-border-soft rounded-lg p-4 text-center">
                <p className="text-sm mb-1">{m.icon}</p>
                <p className={`text-xl font-bold ${m.color}`}>{formatNumber(m.value)}</p>
                <p className="text-xs text-phm-gray-soft mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          {engagement > 0 && (
            <div className="bg-phm-surface border border-phm-border-soft rounded-lg px-4 py-3">
              <span className="text-sm text-phm-gray">Engagement total: </span>
              <span className="text-sm font-bold text-white">{formatNumber(engagement)}</span>
            </div>
          )}
        </>
      )}

      {/* Formulario de edición */}
      <PremiumCard padding="md">
        <h2 className="font-semibold text-white mb-5">Editar contenido</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cliente</label>
              <select name="clientId" value={form.clientId} onChange={handleChange} className={selectCls}>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Plan mensual</label>
              <select name="planId" value={form.planId} onChange={handleChange} className={selectCls}>
                {plans.map((p: any) => <option key={p.id} value={p.id}>{getMonthName(p.month)} {p.year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo</label>
              <select name="type" value={form.type} onChange={handleChange} className={selectCls}>
                <option value="REEL">Reel</option>
                <option value="CAROUSEL">Carrusel</option>
                <option value="FLYER">Flyer</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="status" value={form.status} onChange={handleChange} className={selectCls}>
                <option value="PENDING">Pendiente</option>
                <option value="EDITING">En Edición</option>
                <option value="APPROVED">Aprobado</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="COMPLETED">Completado</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Título</label>
            <input name="title" value={form.title} onChange={handleChange} required className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Link de Drive</label>
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
            <label className={labelCls}>Métricas</label>
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
                  <input name={field.name} type="number" min="0" value={form[field.name] || 0} onChange={handleChange}
                    className="w-full px-2 py-1.5 bg-phm-charcoal border border-phm-border-soft rounded text-white text-sm text-center focus:outline-none focus:border-phm-gold/40" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}
          {success && <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-900/60 rounded-lg text-sm text-emerald-300">{success}</div>}

          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </PremiumCard>

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
