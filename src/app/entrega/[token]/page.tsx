'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Clock, AlertCircle, ExternalLink, Package, Film, LayoutGrid, Image } from 'lucide-react'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendiente', color: 'text-yellow-400' },
    PENDIENTE: { label: 'Pendiente', color: 'text-yellow-400' },
    EDITING: { label: 'En edición', color: 'text-blue-400' },
    EN_PROCESO: { label: 'En proceso', color: 'text-blue-400' },
    APPROVED: { label: 'Aprobado', color: 'text-green-400' },
    APROBADO: { label: 'Aprobado', color: 'text-green-400' },
    PUBLISHED: { label: 'Publicado', color: 'text-purple-400' },
    PUBLICADO: { label: 'Publicado', color: 'text-purple-400' },
    COMPLETED: { label: 'Completado', color: 'text-green-500' },
    COMPLETADO: { label: 'Completado', color: 'text-green-500' },
    ENTREGADO: { label: 'Entregado', color: 'text-green-400' },
  }
  return map[status] ?? { label: status, color: 'text-gray-400' }
}

function planStatusInfo(status: string) {
  if (status === 'COMPLETED') return { label: 'Completado', icon: <CheckCircle className="w-5 h-5 text-green-400" /> }
  if (status === 'DELAYED') return { label: 'Atrasado', icon: <AlertCircle className="w-5 h-5 text-red-400" /> }
  return { label: 'En progreso', icon: <Clock className="w-5 h-5 text-yellow-400" /> }
}

function projectStatusInfo(status: string) {
  const map: Record<string, string> = {
    PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', EN_EDICION: 'En edición',
    APROBADO: 'Aprobado', ENTREGADO: 'Entregado', COMPLETADO: 'Completado', ATRASADO: 'Atrasado',
  }
  return map[status] ?? status
}

function typeIcon(type: string) {
  if (type === 'REEL' || type === 'VIDEO') return <Film className="w-4 h-4 text-purple-400" />
  if (type === 'CAROUSEL') return <LayoutGrid className="w-4 h-4 text-blue-400" />
  if (type === 'FLYER' || type === 'IMAGEN_FLYER') return <Image className="w-4 h-4 text-orange-400" />
  return <Package className="w-4 h-4 text-gray-400" />
}

function RingProgress({ value }: { value: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="#D4AF37" strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 44 44)" />
      <text x="44" y="49" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{value}%</text>
    </svg>
  )
}

export default function EntregaTokenPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/public/delivery/${token}`)
      .then(async (r) => {
        if (!r.ok) { const e = await r.json(); setError(e.error || 'Error'); return }
        setData(await r.json())
      })
      .catch(() => setError('No se pudo cargar la información'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link no disponible</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    )
  }

  const { client, monthlyPlan, project } = data

  // Calcular progreso del plan mensual
  let ringValue = 0
  let totalContracted = 0
  let totalDelivered = 0
  if (monthlyPlan) {
    const DELIVERED = ['APPROVED','PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO','COMPLETADO','APROBADO']
    const delivered = (monthlyPlan.contents || []).filter((c: any) => DELIVERED.includes(c.status)).length
    const contracted = (monthlyPlan.reelsCount || 0) + (monthlyPlan.carouselsCount || 0) + (monthlyPlan.flyersCount || 0)
    totalContracted = contracted
    totalDelivered = delivered
    ringValue = contracted > 0 ? Math.round((delivered / contracted) * 100) : 0
  }

  const planInfo = monthlyPlan ? planStatusInfo(monthlyPlan.planStatus) : null

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <span className="text-yellow-500 font-bold text-sm">P</span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">PHMavericks</p>
            <p className="text-sm font-semibold text-white">{client.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Info del cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">{client.business}</p>
          <h1 className="text-2xl font-bold text-white mt-1">{client.name}</h1>
        </div>

        {/* Plan mensual */}
        {monthlyPlan && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Plan Mensual</p>
                <h2 className="text-lg font-bold text-white">
                  {MONTH_NAMES[monthlyPlan.month - 1]} {monthlyPlan.year}
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5">
                {planInfo?.icon}
                <span className="text-sm text-zinc-200">{planInfo?.label}</span>
              </div>
            </div>

            {/* Progreso */}
            <div className="flex items-center gap-6">
              <RingProgress value={ringValue} />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-zinc-300">Reels: <span className="font-semibold text-white">{monthlyPlan.reelsCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-300">Carruseles: <span className="font-semibold text-white">{monthlyPlan.carouselsCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-zinc-300">Flyers: <span className="font-semibold text-white">{monthlyPlan.flyersCount}</span></span>
                </div>
                <p className="text-xs text-zinc-500 pt-1">{totalDelivered} de {totalContracted} entregados</p>
              </div>
            </div>

            {/* Link de entrega */}
            {monthlyPlan.deliveryLink && (
              <a href={monthlyPlan.deliveryLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-semibold hover:bg-yellow-500/20 transition-colors">
                <ExternalLink className="w-4 h-4" />
                Ver Carpeta de Entrega
              </a>
            )}

            {/* Contenidos */}
            {(monthlyPlan.contents || []).length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Contenidos</p>
                <div className="space-y-2">
                  {monthlyPlan.contents.map((c: any) => {
                    const st = statusLabel(c.status)
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {typeIcon(c.type)}
                          <span className="text-sm text-zinc-200 truncate max-w-[200px]">{c.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                          {c.publishedLink && (
                            <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                              className="text-zinc-500 hover:text-white transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proyecto */}
        {project && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Proyecto</p>
                <h2 className="text-lg font-bold text-white">{project.nombre}</h2>
              </div>
              <span className="bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-1.5">
                {projectStatusInfo(project.estado)}
              </span>
            </div>

            {project.observaciones && (
              <p className="text-sm text-zinc-400">{project.observaciones}</p>
            )}

            {project.fechaEntrega && (
              <p className="text-sm text-zinc-400">
                Fecha de entrega: <span className="text-white font-medium">
                  {new Date(project.fechaEntrega).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </p>
            )}

            {project.linkEntrega && (
              <a href={project.linkEntrega} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-semibold hover:bg-yellow-500/20 transition-colors">
                <ExternalLink className="w-4 h-4" />
                Ver Entrega del Proyecto
              </a>
            )}

            {(project.contents || []).length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Contenidos</p>
                <div className="space-y-2">
                  {project.contents.map((c: any) => {
                    const st = statusLabel(c.status)
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {typeIcon(c.type)}
                          <span className="text-sm text-zinc-200 truncate max-w-[200px]">{c.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                          {c.publishedLink && (
                            <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                              className="text-zinc-500 hover:text-white transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 pb-4">
          Este link es privado y fue generado específicamente para {client.name} por PHMavericks.
        </p>
      </main>
    </div>
  )
}
