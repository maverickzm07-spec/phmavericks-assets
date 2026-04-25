'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] || 'bg-zinc-800 text-zinc-400 border-zinc-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function StatusBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-950 text-green-400 border border-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
      Inactivo
    </span>
  )
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Equipo</h1>
          <p className="text-zinc-500 text-sm">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/usuarios/nuevo"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
          style={{ backgroundColor: '#8B0000' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear usuario
        </Link>
      </div>

      {/* Roles info */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <RoleBadge role={key} />
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              {key === 'SUPER_ADMIN' && 'Control total del sistema'}
              {key === 'ADMIN' && 'Gestión de clientes y planes'}
              {key === 'VENTAS' && 'Clientes y asignación de servicios'}
              {key === 'PRODUCCION' && 'Ver y actualizar contenidos'}
              {key === 'SOLO_LECTURA' && 'Solo visualización'}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-zinc-400 font-medium mb-1">No hay usuarios</p>
            <p className="text-zinc-600 text-sm mb-4">Crea el primer miembro del equipo.</p>
            <Link href="/usuarios/nuevo" className="text-sm font-medium text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#8B0000' }}>
              Crear usuario
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Usuario</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Correo</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Cédula</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Rol</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Desde</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-zinc-800/30 transition-colors ${!u.activo ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: u.role === 'SUPER_ADMIN' ? '#78350f' : '#27272a' }}>
                          <span className="text-xs font-bold text-zinc-200">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-zinc-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-400">{u.email}</td>
                    <td className="px-5 py-3.5 text-sm text-zinc-500">{u.cedula || '—'}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5"><StatusBadge activo={u.activo} /></td>
                    <td className="px-5 py-3.5 text-sm text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/usuarios/${u.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-all"
                        >
                          Editar
                        </Link>
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => { setDeleteError(''); setDeleteId(u.id) }}
                            className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-md transition-all"
                          >
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
        )}
      </div>

      <Modal
        isOpen={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteError('') }}
        onConfirm={deleteError ? () => { setDeleteId(null); setDeleteError('') } : handleDelete}
        isLoading={deleting}
        title="¿Eliminar usuario?"
        description={
          deleteError
            ? deleteError
            : `Se eliminará permanentemente la cuenta de "${deletingUser?.name}". Esta acción no se puede deshacer.`
        }
        confirmLabel={deleteError ? 'Cerrar' : 'Eliminar'}
      />
    </div>
  )
}
