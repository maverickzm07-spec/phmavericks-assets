'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Sparkles, ArrowUpRight } from 'lucide-react'
import { Client } from '@/types'
import { clientStatusBadge } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import PremiumCard from '@/components/ui/PremiumCard'

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
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Gestión</span>
        </div>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Clientes</h1>
            <p className="text-phm-gray-soft text-sm mt-1">
              {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/clientes/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </Link>
        </div>
      </header>

      <PremiumCard padding="sm">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-phm-surface border border-phm-border-soft rounded-lg px-3 py-2 focus-within:border-phm-gold/40 transition-colors">
            <Search className="w-4 h-4 text-phm-gray-soft flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o negocio..."
              className="bg-transparent outline-none text-sm text-white placeholder:text-phm-gray-soft flex-1 min-w-0"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="PAUSED">Pausado</option>
            <option value="FINISHED">Finalizado</option>
          </select>
        </div>
      </PremiumCard>

      {loading ? (
        <PremiumCard padding="none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[58px] skeleton-shimmer border-b border-phm-border-soft last:border-0" />
          ))}
        </PremiumCard>
      ) : clients.length === 0 ? (
        <PremiumCard padding="none">
          <EmptyState
            title="No hay clientes"
            description="Agrega tu primer cliente para empezar a gestionar contenidos."
            actionLabel="Nuevo Cliente"
            actionHref="/clientes/nuevo"
          />
        </PremiumCard>
      ) : (
        <PremiumCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Cliente / Negocio</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Contacto</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Servicio</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Estado</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-phm-border-soft">
                {clients.map((client) => (
                  <tr key={client.id} className="row-hover">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-phm-red to-phm-red-mid text-white text-[11px] font-bold shadow-glow-red flex-shrink-0">
                          {(client.name || '?').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{client.name}</p>
                          <p className="text-xs text-phm-gray-soft">{client.business}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-phm-gray">{client.contact || '—'}</p>
                      {client.email && <p className="text-xs text-phm-gray-soft">{client.email}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      {(client as any).servicePlan ? (
                        <div>
                          <p className="text-sm text-white">{(client as any).servicePlan.nombre}</p>
                          <p className="text-xs text-phm-gray-soft">${(client as any).servicePlan.precio}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-phm-gray-soft">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">{clientStatusBadge(client.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/clientes/${client.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                          Ver <ArrowUpRight className="w-3 h-3" />
                        </Link>
                        <button onClick={() => setDeleteId(client.id)} className="inline-flex items-center text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded-md border border-red-900/40 hover:border-red-700/60 bg-red-950/20 hover:bg-red-950/40">
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
      )}

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
