'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { contentStatusBadge, contentTypeBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatNumber } from '@/lib/utils'

export default function ContenidoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [content, setContent] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setUserRole(d.role) })
  }, [])

  useEffect(() => {
    Promise.all([
      fetch(`/api/contenidos/${id}`).then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
    ]).then(([contentData, clientsData]) => {
      setContent(contentData)
      setClients(Array.isArray(clientsData) ? clientsData : [])
      setForm({
        clientId: contentData.clientId,
        planId: contentData.planId || '',
        type: contentData.type,
        title: contentData.title,
        status: contentData.status,
        requierePublicacion: contentData.requierePublicacion ?? false,
        driveLink: contentData.driveLink || '',
        publishedLink: contentData.publishedLink || '',
        observations: contentData.observations || '',
      })
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/contenidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planId: form.planId || null }),
      })
      if (res.ok) {
        setSuccess('Guardado correctamente')
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

  const canDelete = userRole === 'SUPER_ADMIN'
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'PRODUCCION'].includes(userRole)

  const hasMetrics = (content.views + content.likes + content.comments + content.shares + content.saves) > 0

  const TIPOS = [
    { value: 'REEL', label: 'Reel' },
    { value: 'VIDEO_HORIZONTAL', label: 'Video horizontal' },
    { value: 'FOTO', label: 'Foto' },
    { value: 'IMAGEN_FLYER', label: 'Imagen / Flyer' },
    { value: 'EXTRA', label: 'Extra' },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contenidos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-50 truncate">{content.title}</h1>
          <p className="text-zinc-500 text-sm">{content.client?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {contentTypeBadge(content.type)}
          {contentStatusBadge(content.status)}
          {canDelete && (
            <button onClick={() => setShowDelete(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-lg">
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Métricas */}
      {content.requierePublicacion && hasMetrics && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Views', value: content.views },
            { label: 'Likes', value: content.likes },
            { label: 'Comentarios', value: content.comments },
            { label: 'Compartidos', value: content.shares },
            { label: 'Guardados', value: content.saves },
            { label: 'Alcance', value: content.reach },
            { label: 'Impresiones', value: content.impressions },
          ].filter(m => m.value > 0).map(m => (
            <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-zinc-200">{formatNumber(m.value)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}
      {content.ultimaActualizacionMetricas && (
        <p className="text-xs text-zinc-600">Métricas actualizadas: {new Date(content.ultimaActualizacionMetricas).toLocaleString('es-MX')}</p>
      )}

      {/* Formulario de edición */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold text-zinc-100 mb-5">Editar entregable</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente</label>
            <select value={form.clientId} onChange={e => setForm((p: any) => ({ ...p, clientId: e.target.value }))}
              disabled={!canWrite}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-60">
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo</label>
              <select value={form.type} onChange={e => setForm((p: any) => ({ ...p, type: e.target.value }))}
                disabled={!canWrite}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-60">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
              <select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}
                disabled={!canWrite}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-60">
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="ENTREGADO">Entregado</option>
                <option value="PUBLICADO">Publicado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título</label>
            <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} required
              disabled={!canWrite}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-60" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link de Drive</label>
            <input type="url" value={form.driveLink} onChange={e => setForm((p: any) => ({ ...p, driveLink: e.target.value }))}
              disabled={!canWrite} placeholder="https://drive.google.com/..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-60" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <input type="checkbox" id="reqPub" checked={form.requierePublicacion}
              onChange={e => setForm((p: any) => ({ ...p, requierePublicacion: e.target.checked }))}
              disabled={!canWrite} className="w-4 h-4 accent-red-700" />
            <label htmlFor="reqPub" className="text-sm text-zinc-300 cursor-pointer">Requiere publicación en redes</label>
          </div>

          {form.requierePublicacion && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link publicado</label>
              <input type="url" value={form.publishedLink} onChange={e => setForm((p: any) => ({ ...p, publishedLink: e.target.value }))}
                disabled={!canWrite} placeholder="https://..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-60" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Observaciones</label>
            <textarea value={form.observations} onChange={e => setForm((p: any) => ({ ...p, observations: e.target.value }))} rows={3}
              disabled={!canWrite}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none disabled:opacity-60" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}
          {success && <div className="px-4 py-3 bg-green-950 border border-green-800 rounded-lg text-sm text-green-400">{success}</div>}

          {canWrite && (
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#8B0000' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </form>
      </div>

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="¿Eliminar entregable?"
        description={`Se eliminará "${content.title}". Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
