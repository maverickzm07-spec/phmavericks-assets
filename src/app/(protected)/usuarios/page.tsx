'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={role === 'ADMIN' ? 'red' : 'blue'}>
      {role === 'ADMIN' ? 'Admin' : 'Editor'}
    </Badge>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Usuarios</h1>
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

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg">
        <svg className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-zinc-400">
          Los usuarios con rol <span className="text-red-400 font-medium">Admin</span> tienen acceso completo al sistema.
          Los usuarios con rol <span className="text-blue-400 font-medium">Editor</span> tienen acceso de solo lectura y edición de contenidos.
        </p>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Cargando...</div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No hay usuarios"
            description="Crea el primer usuario administrador."
            actionLabel="Crear usuario"
            actionHref="/usuarios/nuevo"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Usuario</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Correo</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Registrado</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-zinc-300">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">{u.email}</td>
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
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
                      <button
                        onClick={() => { setDeleteError(''); setDeleteId(u.id) }}
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
        )}
      </div>

      <Modal
        isOpen={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteError('') }}
        onConfirm={handleDelete}
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
