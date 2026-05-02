'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientProject } from '@/types'
import PremiumCard from '@/components/ui/PremiumCard'
import ProgressBar from '@/components/ui/ProgressBar'
import DeliveryAccessCard from '@/components/ui/DeliveryAccessCard'
import { getStatusLabel, getProjectStatusColor, getFormatoLabel, getContentTypeLabel, getContentStatusColor, getModalidadLabel } from '@/lib/utils'

const ESTADOS_PROYECTO = ['PENDIENTE','EN_PROCESO','EN_EDICION','APROBADO','ENTREGADO','COMPLETADO','ATRASADO']
const ESTADOS_CONTENIDO = ['PENDING','EDITING','EN_PROCESO','APPROVED','ENTREGADO','PUBLISHED','COMPLETED']

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [project, setProject] = useState<ClientProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [canAdmin, setCanAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : null)
      .then((u) => { if (['SUPER_ADMIN', 'ADMIN'].includes(u?.role)) setCanAdmin(true) })
      .catch(() => {})
  }, [])

  const fetchProject = () => {
    fetch(`/api/proyectos/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setProject(d); if (d) setEditEstado(d.estado) })
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProject() }, [id])

  const updateEstado = async (nuevoEstado: string) => {
    setSaving(true)
    const res = await fetch(`/api/proyectos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (res.ok) fetchProject()
    setSaving(false)
  }

  const updateContentStatus = async (contentId: string, status: string) => {
    const c = project!.contents?.find((c) => c.id === contentId)
    if (!c) return
    await fetch(`/api/contenidos/${contentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: project!.clientId, projectId: project!.id, planId: null,
        type: c.type, formato: c.formato || null, title: c.title, status,
        driveLink: c.driveLink || '', publishedLink: c.publishedLink || '',
        views: c.views, likes: c.likes, comments: c.comments, shares: c.shares, saves: c.saves,
        observations: c.observations || '',
      }),
    })
    fetchProject()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este proyecto?')) return
    await fetch(`/api/proyectos/${id}`, { method: 'DELETE' })
    router.push('/proyectos')
  }

  if (loading) return (
    <div className="max-w-3xl space-y-4">
      <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
      <div className="h-44 skeleton-shimmer rounded-2xl" />
      <div className="h-64 skeleton-shimmer rounded-2xl" />
    </div>
  )
  if (!project) return (
    <PremiumCard padding="lg" className="text-center">
      <p className="text-phm-gray mb-3">Proyecto no encontrado.</p>
      <Link href="/proyectos" className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">← Volver a proyectos</Link>
    </PremiumCard>
  )

  const contents = project.contents || []
  const doneStatuses = ['PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO']
  const done = contents.filter((c) => doneStatuses.includes(c.status)).length
  const pct = contents.length > 0 ? Math.round((done / contents.length) * 100) : 0

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/proyectos" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{project.nombre}</h1>
          <p className="text-phm-gray-soft text-sm">{project.client?.name} — {project.client?.business}</p>
        </div>
        <button onClick={handleDelete}
          className="px-3 py-2 text-sm font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
          Eliminar
        </button>
      </div>

      {/* Info + Estado */}
      <PremiumCard padding="md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getProjectStatusColor(project.estado)}`}>
                {getStatusLabel(project.estado, 'project')}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-phm-surface border border-phm-border-soft text-phm-gray">
                {getModalidadLabel(project.modalidad)}
              </span>
              {project.service && <span className="text-xs text-phm-gray-soft">{project.service.nombre}</span>}
            </div>
            {project.fechaEntrega && (
              <p className="text-xs text-phm-gray-soft">
                Fecha de entrega: <span className="text-phm-gray">{new Date(project.fechaEntrega).toLocaleDateString('es-MX')}</span>
              </p>
            )}
            {project.linkEntrega && (
              <a href={project.linkEntrega} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                🔗 Link de entrega general ↗
              </a>
            )}
            {project.observaciones && <p className="text-xs text-phm-gray-soft">{project.observaciones}</p>}
          </div>
          <div className="flex-shrink-0">
            <label className="block text-xs text-phm-gray-soft mb-1.5">Cambiar estado</label>
            <select value={editEstado} onChange={(e) => { setEditEstado(e.target.value); updateEstado(e.target.value) }}
              disabled={saving}
              className="px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 disabled:opacity-50 transition-colors">
              {ESTADOS_PROYECTO.map((e) => <option key={e} value={e}>{getStatusLabel(e, 'project')}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-phm-border-soft">
          <div className="flex justify-between text-xs text-phm-gray-soft mb-2">
            <span>{done} de {contents.length} entregables completados</span>
            <span className={`font-semibold ${pct === 100 ? 'text-emerald-400' : 'text-phm-gold'}`}>{pct}%</span>
          </div>
          <ProgressBar value={pct} size="md" />
        </div>
      </PremiumCard>

      {/* Link privado de entrega */}
      {canAdmin && (
        <PremiumCard padding="md">
          <h2 className="font-semibold text-white mb-4">Link privado de entrega</h2>
          <DeliveryAccessCard
            clientId={project.clientId}
            entityType="PROJECT"
            entityId={project.id}
            existing={(project as any).deliveryAccesses?.[0] ?? null}
          />
        </PremiumCard>
      )}

      {/* Entregables */}
      <PremiumCard padding="none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-phm-border-soft">
          <h2 className="font-semibold text-white text-sm">Entregables ({contents.length})</h2>
          <Link href={`/contenidos/nuevo?projectId=${project.id}&clientId=${project.clientId}`}
            className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">+ Agregar entregable</Link>
        </div>

        {contents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-phm-gray-soft text-sm mb-3">No hay entregables todavía.</p>
            <Link href={`/contenidos/nuevo?projectId=${project.id}&clientId=${project.clientId}`}
              className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">+ Agregar uno</Link>
          </div>
        ) : (
          <div className="divide-y divide-phm-border-soft">
            {contents.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3 row-hover">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-phm-gray-soft">{getContentTypeLabel(c.type)}</span>
                    {c.formato && <span className="text-xs text-phm-gray-soft">· {getFormatoLabel(c.formato)}</span>}
                    {c.driveLink && <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">↗ Drive</a>}
                    {c.publishedLink && <a href={c.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">↗ Publicado</a>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={c.status} onChange={(e) => updateContentStatus(c.id, e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border-0 focus:outline-none cursor-pointer ${getContentStatusColor(c.status)}`}>
                    {ESTADOS_CONTENIDO.map((s) => <option key={s} value={s}>{getStatusLabel(s, 'content')}</option>)}
                  </select>
                  <Link href={`/contenidos/${c.id}`}
                    className="text-xs text-phm-gray hover:text-phm-gold transition-colors px-2 py-1 bg-phm-surface border border-phm-border-soft rounded-lg">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </PremiumCard>

      {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}
    </div>
  )
}
