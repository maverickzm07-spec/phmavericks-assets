'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClientProject } from '@/types'
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
        clientId: project!.clientId,
        projectId: project!.id,
        planId: null,
        type: c.type,
        formato: c.formato || null,
        title: c.title,
        status,
        driveLink: c.driveLink || '',
        publishedLink: c.publishedLink || '',
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

  if (loading) return <div className="text-zinc-500 text-sm py-16 text-center">Cargando proyecto...</div>
  if (!project) return (
    <div className="text-center py-16">
      <p className="text-zinc-400">Proyecto no encontrado.</p>
      <Link href="/proyectos" className="text-sm underline text-zinc-500 mt-2 inline-block">Volver</Link>
    </div>
  )

  const contents = project.contents || []
  const doneStatuses = ['PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO']
  const done = contents.filter((c) => doneStatuses.includes(c.status)).length
  const pct = contents.length > 0 ? Math.round((done / contents.length) * 100) : 0

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/proyectos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-50 truncate">{project.nombre}</h1>
          <p className="text-zinc-500 text-sm">{project.client?.name} — {project.client?.business}</p>
        </div>
        <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
          Eliminar
        </button>
      </div>

      {/* Info + Estado */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getProjectStatusColor(project.estado)}`}>
                {getStatusLabel(project.estado, 'project')}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                {getModalidadLabel(project.modalidad)}
              </span>
              {project.service && (
                <span className="text-xs text-zinc-500">{project.service.nombre}</span>
              )}
            </div>
            {project.fechaEntrega && (
              <p className="text-xs text-zinc-500">
                Fecha de entrega: <span className="text-zinc-300">{new Date(project.fechaEntrega).toLocaleDateString('es-MX')}</span>
              </p>
            )}
            {project.linkEntrega && (
              <a href={project.linkEntrega} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300">
                🔗 Link de entrega general ↗
              </a>
            )}
            {project.observaciones && (
              <p className="text-xs text-zinc-500">{project.observaciones}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <label className="block text-xs text-zinc-500 mb-1">Cambiar estado</label>
            <select value={editEstado} onChange={(e) => { setEditEstado(e.target.value); updateEstado(e.target.value) }}
              disabled={saving}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none disabled:opacity-50">
              {ESTADOS_PROYECTO.map((e) => (
                <option key={e} value={e}>{getStatusLabel(e, 'project')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progreso */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>{done} de {contents.length} entregables completados</span>
            <span className="font-semibold" style={{ color: pct === 100 ? '#16a34a' : '#8B0000' }}>{pct}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#8B0000' }} />
          </div>
        </div>
      </div>

      {/* Entregables */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100 text-sm">Entregables ({contents.length})</h2>
          <Link href={`/contenidos/nuevo?projectId=${project.id}&clientId=${project.clientId}`}
            className="text-xs px-3 py-1.5 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            + Agregar entregable
          </Link>
        </div>

        {contents.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">
            No hay entregables. <Link href={`/contenidos/nuevo?projectId=${project.id}&clientId=${project.clientId}`} className="underline hover:text-zinc-300">Agregar uno</Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {contents.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-zinc-500">{getContentTypeLabel(c.type)}</span>
                    {c.formato && (
                      <span className="text-xs text-zinc-600">· {getFormatoLabel(c.formato)}</span>
                    )}
                    {c.driveLink && (
                      <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300">↗ Drive</a>
                    )}
                    {c.publishedLink && (
                      <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:text-green-300">↗ Publicado</a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={c.status}
                    onChange={(e) => updateContentStatus(c.id, e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border-0 focus:outline-none cursor-pointer ${getContentStatusColor(c.status)}`}>
                    {ESTADOS_CONTENIDO.map((s) => (
                      <option key={s} value={s}>{getStatusLabel(s, 'content')}</option>
                    ))}
                  </select>
                  <Link href={`/contenidos/${c.id}`}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 bg-zinc-800 rounded-lg">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}
    </div>
  )
}
