'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, ArrowUpRight } from 'lucide-react'
import { ClientProject } from '@/types'
import { getProjectStatusColor, getStatusLabel, getModalidadLabel } from '@/lib/utils'
import PremiumCard from '@/components/ui/PremiumCard'

const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO', 'ENTREGADO', 'COMPLETADO', 'ATRASADO']

export default function ProyectosPage() {
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [filterModalidad, setFilterModalidad] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchProjects = () => {
    const params = new URLSearchParams()
    if (filterClient) params.set('clientId', filterClient)
    if (filterModalidad) params.set('modalidad', filterModalidad)
    if (filterEstado) params.set('estado', filterEstado)
    fetch(`/api/proyectos?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients).catch(() => {})
  }, [])

  useEffect(() => { setLoading(true); fetchProjects() }, [filterClient, filterModalidad, filterEstado])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto? Los contenidos asociados quedarán sin proyecto.')) return
    setDeleting(id)
    await fetch(`/api/proyectos/${id}`, { method: 'DELETE' })
    fetchProjects()
    setDeleting(null)
  }

  const pending = projects.filter((p) => ['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO'].includes(p.estado)).length
  const done = projects.filter((p) => ['ENTREGADO', 'COMPLETADO'].includes(p.estado)).length

  const selectCls = 'px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors'

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Producción</span>
        </div>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Proyectos</h1>
            <p className="text-phm-gray-soft text-sm mt-1">Trabajos mensuales y ocasionales por cliente</p>
          </div>
          <Link href="/proyectos/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Proyecto
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: projects.length, color: 'text-phm-gold' },
          { label: 'Activos', value: pending, color: 'text-amber-400' },
          { label: 'Completados', value: done, color: 'text-emerald-400' },
        ].map((s) => (
          <PremiumCard key={s.label} padding="md" className="text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-phm-gray-soft mt-0.5">{s.label}</p>
          </PremiumCard>
        ))}
      </div>

      <PremiumCard padding="sm">
        <div className="flex flex-wrap gap-3">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className={selectCls}>
            <option value="">Todos los clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterModalidad} onChange={(e) => setFilterModalidad(e.target.value)} className={selectCls}>
            <option value="">Todas las modalidades</option>
            <option value="MENSUAL">Mensual</option>
            <option value="OCASIONAL">Ocasional</option>
          </select>
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className={selectCls}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{getStatusLabel(e, 'project')}</option>)}
          </select>
          {(filterClient || filterModalidad || filterEstado) && (
            <button onClick={() => { setFilterClient(''); setFilterModalidad(''); setFilterEstado('') }}
              className="px-3 py-2 text-sm text-phm-gray hover:text-white bg-phm-surface border border-phm-border-soft rounded-lg transition-colors">
              Limpiar filtros
            </button>
          )}
        </div>
      </PremiumCard>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <PremiumCard padding="none">
          <div className="text-center py-16">
            <p className="text-phm-gray text-sm">No hay proyectos.{' '}
              <Link href="/proyectos/nuevo" className="text-phm-gold hover:text-phm-gold-bright underline">Crear uno</Link>
            </p>
          </div>
        </PremiumCard>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const contents = (p.contents as any[]) || []
            const total = contents.length
            const done = contents.filter((c: any) => ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO'].includes(c.status)).length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0

            return (
              <PremiumCard key={p.id} hover padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProjectStatusColor(p.estado)}`}>
                        {getStatusLabel(p.estado, 'project')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-phm-surface border border-phm-border-soft text-phm-gray">
                        {getModalidadLabel(p.modalidad)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{p.nombre}</h3>
                    <p className="text-xs text-phm-gray-soft mt-0.5">
                      {p.client?.name} — {p.client?.business}
                      {p.service && <span className="ml-2 text-phm-gray-soft opacity-60">· {p.service.nombre}</span>}
                    </p>
                    {p.fechaEntrega && (
                      <p className="text-xs text-phm-gray-soft mt-1">
                        Entrega: {new Date(p.fechaEntrega).toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/proyectos/${p.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                      Ver <ArrowUpRight className="w-3 h-3" />
                    </Link>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      className="inline-flex items-center text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded-md border border-red-900/40 hover:border-red-700/60 bg-red-950/20 hover:bg-red-950/40 disabled:opacity-50">
                      Eliminar
                    </button>
                  </div>
                </div>

                {total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-phm-gray-soft mb-1.5">
                      <span>{done} de {total} entregables completados</span>
                      <span className="font-semibold text-white">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-phm-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#8B0000,#E50914)' }} />
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {contents.slice(0, 4).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-phm-gray truncate max-w-[60%]">{c.title}</span>
                          <div className="flex items-center gap-2">
                            {c.formato && <span className="text-phm-gray-soft">{c.formato.replace('_', ':').replace('_', '/')}</span>}
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO'].includes(c.status)
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : c.status === 'EDITING' || c.status === 'EN_PROCESO'
                                ? 'bg-blue-950/60 text-blue-300'
                                : 'bg-phm-surface text-phm-gray-soft'
                            }`}>
                              {getStatusLabel(c.status, 'content')}
                            </span>
                            {c.driveLink && (
                              <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-phm-gray-soft hover:text-phm-gold transition-colors">↗</a>
                            )}
                          </div>
                        </div>
                      ))}
                      {contents.length > 4 && (
                        <p className="text-xs text-phm-gray-soft">+{contents.length - 4} más</p>
                      )}
                    </div>
                  </div>
                )}
              </PremiumCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
