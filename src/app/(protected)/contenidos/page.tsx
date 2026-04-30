'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, ArrowUpRight } from 'lucide-react'
import { contentStatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import PremiumCard from '@/components/ui/PremiumCard'
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Contenidos</h1>
            <p className="text-phm-gray-soft text-sm mt-1">
              {contents.length} entregable{contents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-phm-surface border border-phm-border-soft rounded-lg p-0.5">
              {(['lista', 'proyecto'] as const).map((v) => (
                <button key={v} onClick={() => setVista(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${vista === v ? 'bg-phm-charcoal text-white border border-phm-border-soft' : 'text-phm-gray-soft hover:text-white'}`}>
                  {v === 'lista' ? 'Lista' : 'Por Proyecto'}
                </button>
              ))}
            </div>
            <Link href="/contenidos/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Nuevo
            </Link>
          </div>
        </div>
      </header>

      <PremiumCard padding="sm">
        <div className="flex gap-2 flex-wrap">
          <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)} className={selectCls}>
            <option value="">Todos los clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => handleFilter('type', e.target.value)} className={selectCls}>
            <option value="">Todos los tipos</option>
            {ALL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filters.formato} onChange={(e) => handleFilter('formato', e.target.value)} className={selectCls}>
            <option value="">Todos los formatos</option>
            {ALL_FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => handleFilter('status', e.target.value)} className={selectCls}>
            <option value="">Todos los estados</option>
            {ALL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filters.modalidad} onChange={(e) => handleFilter('modalidad', e.target.value)} className={selectCls}>
            <option value="">Todas las modalidades</option>
            <option value="MENSUAL">Mensual</option>
            <option value="OCASIONAL">Ocasional</option>
          </select>
          <select value={filters.month} onChange={(e) => handleFilter('month', e.target.value)} className={selectCls}>
            <option value="">Todos los meses</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={filters.year} onChange={(e) => handleFilter('year', e.target.value)} className={selectCls}>
            <option value="">Todos los años</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => setFilters({ clientId: '', type: '', formato: '', status: '', modalidad: '', month: '', year: '' })}
              className="px-3 py-2 text-sm text-phm-gray hover:text-white bg-phm-surface border border-phm-border-soft rounded-lg transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </PremiumCard>

      {loading ? (
        <PremiumCard padding="none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[52px] skeleton-shimmer border-b border-phm-border-soft last:border-0" />
          ))}
        </PremiumCard>
      ) : contents.length === 0 ? (
        <PremiumCard padding="none">
          <EmptyState title="No hay contenidos" description="Agrega el primer contenido." actionLabel="Nuevo Contenido" actionHref="/contenidos/nuevo" />
        </PremiumCard>
      ) : vista === 'lista' ? (
        <PremiumCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Tipo</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Formato</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Título</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Cliente</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Proyecto / Plan</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Estado</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Views</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-phm-border-soft">
                {contents.map((c) => (
                  <tr key={c.id} className="row-hover">
                    <td className="px-4 py-3">
                      <span className="text-xs bg-phm-surface border border-phm-border-soft text-phm-gray px-2 py-1 rounded">
                        {getContentTypeLabel(c.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-phm-gray-soft">{getFormatoLabel(c.formato)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white max-w-[180px] truncate">{c.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {c.driveLink && <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-phm-gray-soft hover:text-phm-gold transition-colors">↗ Drive</a>}
                        {c.publishedLink && <a href={c.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">↗ Post</a>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-phm-gray">{c.client?.name}</td>
                    <td className="px-4 py-3 text-sm text-phm-gray-soft max-w-[140px] truncate">
                      {c.project
                        ? <Link href={`/proyectos/${c.project.id}`} className="hover:text-phm-gold transition-colors underline">{c.project.nombre}</Link>
                        : c.plan ? `${getMonthName(c.plan.month)} ${c.plan.year}` : '—'}
                    </td>
                    <td className="px-4 py-3">{contentStatusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-sm text-phm-gray">{c.views > 0 ? formatNumber(c.views) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/contenidos/${c.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                          Editar <ArrowUpRight className="w-3 h-3" />
                        </Link>
                        <button onClick={() => setDeleteId(c.id)} className="inline-flex items-center text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded-md border border-red-900/40 hover:border-red-700/60 bg-red-950/20 hover:bg-red-950/40">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PremiumCard>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, group]: any) => {
            const done = group.items.filter((c: any) => ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO'].includes(c.status)).length
            const pct = group.items.length > 0 ? Math.round((done / group.items.length) * 100) : 0
            return (
              <PremiumCard key={key} padding="none">
                <div className="p-4 border-b border-phm-border-soft">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${group.modalidad === 'OCASIONAL' ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60' : 'bg-blue-950/60 text-blue-300 border border-blue-800/60'}`}>
                          {group.modalidad === 'OCASIONAL' ? 'Ocasional' : 'Mensual'}
                        </span>
                      </div>
                      {group.sub && <p className="text-xs text-phm-gray-soft mt-0.5">{group.sub}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-phm-gray-soft">{done} / {group.items.length} completados</p>
                      <p className="text-xs font-semibold" style={{ color: pct === 100 ? '#10B981' : '#C9A84C' }}>{pct}%</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-phm-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#C9A84C,#E5C76B)' }} />
                  </div>
                </div>
                <div className="divide-y divide-phm-border-soft">
                  {group.items.map((c: any) => (
                    <div key={c.id} className="px-4 py-3 flex items-center gap-3 row-hover">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span className="text-xs bg-phm-surface border border-phm-border-soft text-phm-gray px-2 py-0.5 rounded flex-shrink-0">
                          {getContentTypeLabel(c.type)}
                        </span>
                        {c.formato && (
                          <span className="text-xs text-phm-gray-soft flex-shrink-0">{getFormatoLabel(c.formato)}</span>
                        )}
                        <p className="text-sm text-white truncate">{c.title}</p>
                        {c.driveLink && <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-phm-gray-soft hover:text-phm-gold flex-shrink-0">↗ Drive</a>}
                        {c.publishedLink && <a href={c.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">↗ Post</a>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contentStatusBadge(c.status)}
                        <Link href={`/contenidos/${c.id}`} className="text-xs text-phm-gray hover:text-phm-gold px-2 py-1 bg-phm-surface border border-phm-border-soft rounded transition-colors">Editar</Link>
                        <button onClick={() => setDeleteId(c.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/20 border border-red-900/40 rounded transition-colors">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>
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
