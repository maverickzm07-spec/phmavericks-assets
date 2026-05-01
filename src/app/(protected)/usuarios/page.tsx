'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, ArrowUpRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import PremiumCard from '@/components/ui/PremiumCard'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] || 'bg-phm-surface text-phm-gray border-phm-border-soft'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function StatusBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-700/60">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-phm-surface/60 text-phm-gray border border-phm-border-soft">
      <span className="w-1.5 h-1.5 rounded-full bg-phm-gray-soft inline-block" />
      Inactivo
    </span>
  )
}

const ROLE_DESCS: Record<string, string> = {
  SUPER_ADMIN: 'Control total del sistema',
  ADMIN: 'Gestión de clientes y planes',
  VENTAS: 'Clientes y asignación de servicios',
  PRODUCCION: 'Ver y actualizar contenidos',
  SOLO_LECTURA: 'Solo visualización',
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchUsers = () => {
    fetch('/api/usuarios')
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/usuarios/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteId))
        setDeleteId(null)
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Error al eliminar')
      }
    } finally {
      setDeleting(false)
    }
  }

  const deletingUser = users.find((u) => u.id === deleteId)

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Administración</span>
        </div>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Equipo</h1>
            <p className="text-phm-gray-soft text-sm mt-1">
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/usuarios/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-phm-red hover:bg-phm-red-hover text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Crear usuario</span>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <PremiumCard key={key} padding="sm">
            <RoleBadge role={key} />
            <p className="text-xs text-phm-gray-soft mt-2 leading-relaxed">{ROLE_DESCS[key]}</p>
          </PremiumCard>
        ))}
      </div>

      {loading ? (
        <PremiumCard padding="none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[58px] skeleton-shimmer border-b border-phm-border-soft last:border-0" />
          ))}
        </PremiumCard>
      ) : users.length === 0 ? (
        <PremiumCard padding="none">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-white font-medium mb-1">No hay usuarios</p>
            <p className="text-phm-gray-soft text-sm mb-4">Crea el primer miembro del equipo.</p>
            <Link href="/usuarios/nuevo" className="text-sm font-medium text-white px-4 py-2 bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
              Crear usuario
            </Link>
          </div>
        </PremiumCard>
      ) : (
        <PremiumCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Usuario</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Correo</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Cédula</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Rol</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Estado</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Desde</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-phm-border-soft">
                {users.map((u) => (
                  <tr key={u.id} className={`row-hover ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-phm-red to-phm-red-mid text-white text-[11px] font-bold shadow-glow-red">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-phm-gray">{u.email}</td>
                    <td className="px-5 py-3.5 text-sm text-phm-gray-soft">{u.cedula || '—'}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5"><StatusBadge activo={u.activo} /></td>
                    <td className="px-5 py-3.5 text-sm text-phm-gray-soft">
                      {new Date(u.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/usuarios/${u.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors px-2.5 py-1 rounded-md border border-phm-border-soft hover:border-phm-gold/40">
                          Editar <ArrowUpRight className="w-3 h-3" />
                        </Link>
                        {u.role !== 'SUPER_ADMIN' && (
                          <button onClick={() => { setDeleteError(''); setDeleteId(u.id) }} className="inline-flex items-center text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded-md border border-red-900/40 hover:border-red-700/60 bg-red-950/20 hover:bg-red-950/40">
                            Eliminar
                          </button>
                        )}
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
        onClose={() => { setDeleteId(null); setDeleteError('') }}
        onConfirm={deleteError ? () => { setDeleteId(null); setDeleteError('') } : handleDelete}
        isLoading={deleting}
        title="¿Eliminar usuario?"
        description={deleteError ? deleteError : `Se eliminará permanentemente la cuenta de "${deletingUser?.name}". Esta acción no se puede deshacer.`}
        confirmLabel={deleteError ? 'Cerrar' : 'Eliminar'}
      />
    </div>
  )
}
