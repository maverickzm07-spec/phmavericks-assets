'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClientProject } from '@/types'
import { getProjectStatusColor, getStatusLabel, getModalidadLabel } from '@/lib/utils'

const ESTADOS = ['PENDIENTE','EN_PROCESO','EN_EDICION','APROBADO','ENTREGADO','COMPLETADO','ATRASADO']

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

  const pending = projects.filter((p) => ['PENDIENTE','EN_PROCESO','EN_EDICION','APROBADO'].includes(p.estado)).length
  const done = projects.filter((p) => ['ENTREGADO','COMPLETADO'].includes(p.estado)).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Proyectos</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Trabajos mensuales y ocasionales por cliente</p>
        </div>
        <Link href="/proyectos/nuevo"
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#8B0000' }}>
          + Nuevo Proyecto
        </Link>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: projects.length, color: '#8B0000' },
          { label: 'Activos', value: pending, color: '#d97706' },
          { label: 'Completados', value: done, color: '#16a34a' },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none">
          <option value="">Todos los clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterModalidad} onChange={(e) => setFilterModalidad(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none">
          <option value="">Todas las modalidades</option>
          <option value="MENSUAL">Mensual</option>
          <option value="OCASIONAL">Ocasional</option>
        </select>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{getStatusLabel(e, 'project')}</option>)}
        </select>
        {(filterClient || filterModalidad || filterEstado) && (
          <button onClick={() => { setFilterClient(''); setFilterModalidad(''); setFilterEstado('') }}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista de proyectos */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-sm">Cargando proyectos...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-zinc-400 text-sm">No hay proyectos.{' '}
            <Link href="/proyectos/nuevo" className="underline hover:text-zinc-200">Crear uno</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const contents = (p.contents as any[]) || []
            const total = contents.length
            const done = contents.filter((c: any) => ['PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO'].includes(c.status)).length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0

            return (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProjectStatusColor(p.estado)}`}>
                        {getStatusLabel(p.estado, 'project')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                        {getModalidadLabel(p.modalidad)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 truncate">{p.nombre}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {p.client?.name} — {p.client?.business}
                      {p.service && <span className="ml-2 text-zinc-600">· {p.service.nombre}</span>}
                    </p>
                    {p.fechaEntrega && (
                      <p className="text-xs text-zinc-600 mt-1">
                        Entrega: {new Date(p.fechaEntrega).toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/proyectos/${p.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                      Ver detalle
                    </Link>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Progreso de entregables */}
                {total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                      <span>{done} de {total} entregables completados</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#8B0000' }} />
                    </div>
                    {/* Mini lista de entregables */}
                    <div className="mt-3 space-y-1.5">
                      {contents.slice(0, 4).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 truncate max-w-[60%]">{c.title}</span>
                          <div className="flex items-center gap-2">
                            {c.formato && <span className="text-zinc-600">{c.formato.replace('_', ':').replace('_', '/')}</span>}
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              ['PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO'].includes(c.status)
                                ? 'bg-green-950 text-green-400'
                                : c.status === 'EDITING' || c.status === 'EN_PROCESO'
                                ? 'bg-blue-950 text-blue-400'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}>
                              {getStatusLabel(c.status, 'content')}
                            </span>
                            {c.driveLink && (
                              <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-zinc-300">↗</a>
                            )}
                          </div>
                        </div>
                      ))}
                      {contents.length > 4 && (
                        <p className="text-xs text-zinc-600">+{contents.length - 4} más</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
