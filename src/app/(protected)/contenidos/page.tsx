'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { contentStatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { getMonthName, MONTHS, formatNumber, getContentTypeLabel, getFormatoLabel, getStatusLabel } from '@/lib/utils'

const ALL_TYPES = [
  { value: 'VIDEO', label: 'Video' }, { value: 'FOTO', label: 'Foto' },
  { value: 'FLYER', label: 'Flyer' }, { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'REEL', label: 'Reel' }, { value: 'VIDEO_HORIZONTAL', label: 'Video Horizontal' },
  { value: 'IMAGEN_FLYER', label: 'Imagen/Flyer' }, { value: 'EXTRA', label: 'Extra' },
  { value: 'OTRO', label: 'Otro' },
]

const ALL_STATUSES = [
  { value: 'PENDING', label: 'Pendiente' }, { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'EDITING', label: 'En Edición' }, { value: 'APPROVED', label: 'Aprobado' },
  { value: 'ENTREGADO', label: 'Entregado' }, { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'COMPLETED', label: 'Completado' },
]

const ALL_FORMATOS = [
  { value: 'VERTICAL_9_16', label: 'Vertical 9:16' },
  { value: 'HORIZONTAL_16_9', label: 'Horizontal 16:9' },
  { value: 'CUADRADO_1_1', label: 'Cuadrado 1:1' },
  { value: 'NO_APLICA', label: 'No aplica' },
]

export default function ContenidosPage() {
  const [contents, setContents] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'lista' | 'proyecto'>('lista')
  const [filters, setFilters] = useState({ clientId: '', type: '', formato: '', status: '', modalidad: '', month: '', year: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients).catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    setLoading(true)
    fetch(`/api/contenidos?${params}`)
      .then((r) => r.json())
      .then((d) => setContents(Array.isArray(d) ? d : []))
      .catch(() => setContents([]))
      .finally(() => setLoading(false))
  }, [filters])

  const handleFilter = (key: string, value: string) => setFilters((prev) => ({ ...prev, [key]: value }))

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetch(`/api/contenidos/${deleteId}`, { method: 'DELETE' })
      setContents((prev) => prev.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const deletingContent = contents.find((c) => c.id === deleteId)

  // Agrupación por proyecto/cliente para vista "Por Proyecto"
  const grouped = contents.reduce((acc: any, c: any) => {
    const key = c.project ? `proyecto:${c.project.id}` : `cliente:${c.clientId}`
    const label = c.project ? c.project.nombre : (c.client?.name || 'Sin cliente')
    const sub = c.project ? (c.client?.name || '') : ''
    const modalidad = c.project?.modalidad || 'MENSUAL'
    if (!acc[key]) acc[key] = { label, sub, modalidad, items: [] }
    acc[key].items.push(c)
    return acc
  }, {})

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Contenidos</h1>
          <p className="text-zinc-500 text-sm">{contents.length} entregable{contents.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            {(['lista', 'proyecto'] as const).map((v) => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${vista === v ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {v === 'lista' ? 'Lista' : 'Por Proyecto'}
              </button>
            ))}
          </div>
          <Link href="/contenidos/nuevo"
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#8B0000' }}>
            + Nuevo
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todos los clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => handleFilter('type', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todos los tipos</option>
          {ALL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filters.formato} onChange={(e) => handleFilter('formato', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todos los formatos</option>
          {ALL_FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => handleFilter('status', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filters.modalidad} onChange={(e) => handleFilter('modalidad', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todas las modalidades</option>
          <option value="MENSUAL">Mensual</option>
          <option value="OCASIONAL">Ocasional</option>
        </select>
        <select value={filters.month} onChange={(e) => handleFilter('month', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todos los meses</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => handleFilter('year', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none">
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ clientId: '', type: '', formato: '', status: '', modalidad: '', month: '', year: '' })}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg">
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
      ) : contents.length === 0 ? (
        <EmptyState title="No hay contenidos" description="Agrega el primer contenido." actionLabel="Nuevo Contenido" actionHref="/contenidos/nuevo" />
      ) : vista === 'lista' ? (
        /* VISTA LISTA */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Formato</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Título</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Proyecto / Plan</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Views</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {contents.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                        {getContentTypeLabel(c.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{getFormatoLabel(c.formato)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-200 max-w-[180px] truncate">{c.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {c.driveLink && <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-300">↗ Drive</a>}
                        {c.publishedLink && <a href={c.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">↗ Post</a>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{c.client?.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 max-w-[140px] truncate">
                      {c.project
                        ? <Link href={`/proyectos/${c.project.id}`} className="hover:text-zinc-300 underline">{c.project.nombre}</Link>
                        : c.plan ? `${getMonthName(c.plan.month)} ${c.plan.year}` : '—'}
                    </td>
                    <td className="px-4 py-3">{contentStatusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{c.views > 0 ? formatNumber(c.views) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/contenidos/${c.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md">
                          Editar
                        </Link>
                        <button onClick={() => setDeleteId(c.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-md">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA POR PROYECTO */
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, group]: any) => {
            const done = group.items.filter((c: any) => ['PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO'].includes(c.status)).length
            const pct = group.items.length > 0 ? Math.round((done / group.items.length) * 100) : 0
            return (
              <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">{group.label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${group.modalidad === 'OCASIONAL' ? 'bg-purple-950 text-purple-400' : 'bg-blue-950 text-blue-400'}`}>
                          {group.modalidad === 'OCASIONAL' ? 'Ocasional' : 'Mensual'}
                        </span>
                      </div>
                      {group.sub && <p className="text-xs text-zinc-500 mt-0.5">{group.sub}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">{done} / {group.items.length} completados</p>
                      <p className="text-xs font-semibold" style={{ color: pct === 100 ? '#16a34a' : '#8B0000' }}>{pct}%</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#8B0000' }} />
                  </div>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {group.items.map((c: any) => (
                    <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/20">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded flex-shrink-0">
                          {getContentTypeLabel(c.type)}
                        </span>
                        {c.formato && (
                          <span className="text-xs text-zinc-600 flex-shrink-0">{getFormatoLabel(c.formato)}</span>
                        )}
                        <p className="text-sm text-zinc-300 truncate">{c.title}</p>
                        {c.driveLink && <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-300 flex-shrink-0">↗ Drive</a>}
                        {c.publishedLink && <a href={c.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">↗ Post</a>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contentStatusBadge(c.status)}
                        <Link href={`/contenidos/${c.id}`} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 bg-zinc-800 rounded">Editar</Link>
                        <button onClick={() => setDeleteId(c.id)} className="text-xs text-red-500 hover:text-red-400 px-2 py-1 bg-zinc-800 rounded">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="¿Eliminar contenido?"
        description={`Se eliminará "${deletingContent?.title}". Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
