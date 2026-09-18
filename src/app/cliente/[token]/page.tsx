'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock, ExternalLink, Play } from 'lucide-react'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const CONTENT_TYPE_LABEL: Record<string, string> = {
  REEL: 'Reel', VIDEO_HORIZONTAL: 'Video Horizontal', FOTO: 'Foto',
  IMAGEN_FLYER: 'Imagen/Flyer', VIDEO: 'Video', FLYER: 'Flyer', CAROUSEL: 'Carrusel', OTRO: 'Otro',
}

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente', PENDIENTE: 'Pendiente', EDITING: 'En edición', EN_PROCESO: 'En edición',
  APPROVED: 'Aprobado', PUBLISHED: 'Publicado', PUBLICADO: 'Publicado',
  COMPLETED: 'Completado', ENTREGADO: 'Entregado',
}

interface Content { id: string; title: string; type: string; status: string; driveLink?: string; publishedLink?: string; publishedAt?: string }
interface Plan { id: string; month: number; year: number; planStatus: string; reelsCount: number; carouselsCount: number; flyersCount: number; progress: number; totalContents: number; doneContents: number; contents: Content[] }
interface Project { id: string; nombre: string; estado: string; fechaEntrega?: string; linkEntrega?: string; progress: number; totalContents: number; doneContents: number; contents: Content[] }

export default function ClientPortalPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<{ client: { name: string; business: string; status: string }; plans: Plan[]; projects: Project[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/cliente/${token}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null } return r.json() })
      .then((d) => { if (d) setData(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound || !data) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/60 flex items-center justify-center mb-2">
        <span className="text-2xl">🔒</span>
      </div>
      <h1 className="text-xl font-bold text-white">Portal no encontrado</h1>
      <p className="text-zinc-400 text-sm max-w-xs">Este enlace no es válido o ha expirado. Contacta a tu equipo PHMavericks.</p>
    </div>
  )

  const { client, plans, projects } = data

  const StatusDot = ({ status }: { status: string }) => {
    const done = DONE_STATUSES.includes(status)
    return (
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-emerald-400' : 'bg-amber-400'}`} />
    )
  }

  const ProgressRing = ({ value }: { value: number }) => {
    const r = 24
    const circ = 2 * Math.PI * r
    const offset = circ - (value / 100) * circ
    return (
      <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={value >= 100 ? '#22c55e' : '#e50914'} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 32 32)" />
        <text x="32" y="37" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{value}%</text>
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-sm font-bold shadow-lg">
            {client.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white leading-tight">{client.name}</p>
            <p className="text-xs text-zinc-400">{client.business}</p>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wide">PHMavericks</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Planes mensuales */}
        {plans.length > 0 && plans.map((plan) => (
          <section key={plan.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Plan {MONTHS[(plan.month ?? 1) - 1]} {plan.year}</h2>
                <p className="text-sm text-zinc-400">{plan.doneContents} de {plan.totalContents} entregables completados</p>
              </div>
              <ProgressRing value={plan.progress} />
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
              {plan.contents.map((c) => {
                const done = DONE_STATUSES.includes(c.status)
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-950 border border-emerald-800' : 'bg-zinc-800 border border-zinc-700'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-zinc-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusDot status={c.status} />
                        <span className="text-xs text-zinc-400">{STATUS_LABEL[c.status] ?? c.status} · {CONTENT_TYPE_LABEL[c.type] ?? c.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.driveLink && (
                        <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors">
                          <Play className="w-3 h-3" /> Revisar
                        </a>
                      )}
                      {c.publishedLink && (
                        <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/40 transition-colors">
                          <ExternalLink className="w-3 h-3" /> Ver publicado
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
              {plan.contents.length === 0 && (
                <div className="px-4 py-6 text-center text-zinc-500 text-sm">Aún no hay entregables asignados a este plan.</div>
              )}
            </div>
          </section>
        ))}

        {/* Proyectos ocasionales */}
        {projects.length > 0 && projects.map((project) => (
          <section key={project.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{project.nombre}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-zinc-400">{project.doneContents} de {project.totalContents} entregables</p>
                  {project.fechaEntrega && (
                    <span className="text-xs text-zinc-500">· Entrega: {new Date(project.fechaEntrega).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
              <ProgressRing value={project.progress} />
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
              {project.contents.map((c) => {
                const done = DONE_STATUSES.includes(c.status)
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-950 border border-emerald-800' : 'bg-zinc-800 border border-zinc-700'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-zinc-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusDot status={c.status} />
                        <span className="text-xs text-zinc-400">{STATUS_LABEL[c.status] ?? c.status} · {CONTENT_TYPE_LABEL[c.type] ?? c.type}</span>
                      </div>
                    </div>
                    {c.driveLink && (
                      <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors flex-shrink-0">
                        <Play className="w-3 h-3" /> Revisar
                      </a>
                    )}
                  </div>
                )
              })}
              {project.contents.length === 0 && (
                <div className="px-4 py-6 text-center text-zinc-500 text-sm">Aún no hay entregables en este proyecto.</div>
              )}
            </div>

            {project.linkEntrega && (
              <div className="mt-3">
                <a href={project.linkEntrega} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Ver carpeta de entrega
                </a>
              </div>
            )}
          </section>
        ))}

        {plans.length === 0 && projects.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-sm">No hay trabajos activos en este momento.</p>
            <p className="text-xs mt-1">Tu equipo PHMavericks está trabajando en tus contenidos.</p>
          </div>
        )}

        <footer className="text-center pt-4 pb-8">
          <p className="text-xs text-zinc-600">Portal exclusivo para clientes PHMavericks · Solo lectura</p>
        </footer>
      </div>
    </div>
  )
}
