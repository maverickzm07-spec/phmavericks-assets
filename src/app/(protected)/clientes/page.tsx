'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Client } from '@/types'
import { clientStatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchClients = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    fetch(`/api/clientes?${params}`)
      .then(async (r) => {
        const data = await r.json()
        return Array.isArray(data) ? data : []
      })
      .then(setClients)
      .catch((error) => {
        console.error(error)
        setClients([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchClients() }, [search, status])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetch(`/api/clientes/${deleteId}`, { method: 'DELETE' })
      setClients((prev) => prev.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const deletingClient = clients.find((c) => c.id === deleteId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Clientes</h1>
          <p className="text-zinc-500 text-sm">{clients.length} cliente{clients.length !== 1 ? 's' : ''} encontrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
          style={{ backgroundColor: '#8B0000' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Nuevo Cliente</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o negocio..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 transition-all"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="PAUSED">Pausado</option>
          <option value="FINISHED">Finalizado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : clients.length === 0 ? (
          <EmptyState
            title="No hay clientes"
            description="Agrega tu primer cliente para empezar a gestionar contenidos."
            actionLabel="Nuevo Cliente"
            actionHref="/clientes/nuevo"
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Cliente / Negocio</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Contacto</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Servicio</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{client.name}</p>
                      <p className="text-xs text-zinc-500">{client.business}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm text-zinc-300">{client.contact || '—'}</p>
                      {client.email && <p className="text-xs text-zinc-500">{client.email}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {(client as any).servicePlan ? (
                      <div>
                        <p className="text-sm text-zinc-200">{(client as any).servicePlan.nombre}</p>
                        <p className="text-xs text-zinc-500">${(client as any).servicePlan.precio}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">{clientStatusBadge(client.status)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all"
                      >
                        Ver / Editar
                      </Link>
                      <button
                        onClick={() => setDeleteId(client.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-md transition-all"
                      >
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
        title="¿Eliminar cliente?"
        description={`Se eliminará "${deletingClient?.name}" y todos sus planes y contenidos. Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
