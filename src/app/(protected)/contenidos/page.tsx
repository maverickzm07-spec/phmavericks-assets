'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { contentStatusBadge, contentTypeBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { getMonthName, MONTHS, formatNumber } from '@/lib/utils'

export default function ContenidosPage() {
  const [contents, setContents] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ clientId: '', type: '', status: '', month: '', year: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    setLoading(true)
    fetch(`/api/contenidos?${params}`)
      .then((r) => r.json())
      .then(setContents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Contenidos</h1>
          <p className="text-zinc-500 text-sm">{contents.length} contenido{contents.length !== 1 ? 's' : ''} encontrado{contents.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/contenidos/nuevo" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#8B0000' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Contenido
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los clientes</option>
          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => handleFilter('type', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los tipos</option>
          <option value="REEL">Reel</option>
          <option value="CAROUSEL">Carrusel</option>
          <option value="FLYER">Flyer</option>
        </select>
        <select value={filters.status} onChange={(e) => handleFilter('status', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="EDITING">En Edición</option>
          <option value="APPROVED">Aprobado</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="COMPLETED">Completado</option>
        </select>
        <select value={filters.month} onChange={(e) => handleFilter('month', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los meses</option>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => handleFilter('year', e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500">
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : contents.length === 0 ? (
          <EmptyState
            title="No hay contenidos"
            description="Agrega el primer contenido a un plan mensual."
            actionLabel="Nuevo Contenido"
            actionHref="/contenidos/nuevo"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Título</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Views</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {contents.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3">{contentTypeBadge(c.type)}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-zinc-200 max-w-xs truncate">{c.title}</p>
                      {c.publishedLink && (
                        <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline">ver publicación</a>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400">{c.client?.name}</td>
                    <td className="px-5 py-3 text-sm text-zinc-500">
                      {c.plan ? `${getMonthName(c.plan.month)} ${c.plan.year}` : '—'}
                    </td>
                    <td className="px-5 py-3">{contentStatusBadge(c.status)}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400">
                      {c.views > 0 ? formatNumber(c.views) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/contenidos/${c.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all">
                          Editar
                        </Link>
                        <button onClick={() => setDeleteId(c.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-md transition-all">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
