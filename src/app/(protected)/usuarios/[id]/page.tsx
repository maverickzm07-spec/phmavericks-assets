'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import Modal from '@/components/ui/Modal'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'

const ROLES_OPTIONS = [
  { value: 'SUPER_ADMIN', desc: 'Control total del sistema' },
  { value: 'ADMIN', desc: 'Gestión completa de clientes, planes y servicios' },
  { value: 'VENTAS', desc: 'Crear clientes, asignar planes y ver estados comerciales' },
  { value: 'PRODUCCION', desc: 'Ver y actualizar estado de contenidos' },
  { value: 'SOLO_LECTURA', desc: 'Solo visualización, sin edición' },
]

export default function EditarUsuarioPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [originalRole, setOriginalRole] = useState('')

  const [form, setForm] = useState({ name: '', cedula: '', email: '', password: '', role: 'VENTAS', activo: true })

  useEffect(() => {
    fetch(`/api/usuarios/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOriginalRole(data.role)
        setForm({ name: data.name, cedula: data.cedula || '', email: data.email, password: '', role: data.role, activo: data.activo })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.cedula && !/^\d{10}$/.test(form.cedula)) { setError('La cédula debe tener exactamente 10 dígitos numéricos'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, cedula: form.cedula || undefined }) })
      if (res.ok) { setSuccess('Usuario actualizado correctamente'); setForm((prev) => ({ ...prev, password: '' })); setTimeout(() => setSuccess(''), 3000) }
      else { const data = await res.json(); setError(data.error || 'Error al actualizar') }
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true); setDeleteError('')
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
      if (res.ok) { router.push('/usuarios') }
      else { const data = await res.json(); setDeleteError(data.error || 'Error al eliminar') }
    } finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="max-w-lg space-y-4">
      <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
      <div className="h-96 skeleton-shimmer rounded-2xl" />
    </div>
  )

  const roleColor = ROLE_COLORS[originalRole] || 'bg-phm-surface text-phm-gray border-phm-border-soft'
  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/usuarios" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{form.name || 'Editar Usuario'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${roleColor}`}>
              {ROLE_LABELS[originalRole] || originalRole}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
              form.activo ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' : 'bg-phm-surface text-phm-gray-soft border-phm-border-soft'
            }`}>
              {form.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
        {originalRole !== 'SUPER_ADMIN' && (
          <button onClick={() => { setDeleteError(''); setShowDelete(true) }}
            className="px-3 py-2 text-sm font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
            Eliminar
          </button>
        )}
      </div>

      <PremiumCard padding="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nombre completo *</label>
              <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cédula</label>
              <input name="cedula" value={form.cedula} onChange={handleChange} placeholder="10 dígitos" maxLength={10}
                className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm placeholder-phm-gray-soft focus:outline-none focus:border-phm-gold/40 transition-colors" />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="activo" value={form.activo ? 'true' : 'false'}
                onChange={(e) => setForm((p) => ({ ...p, activo: e.target.value === 'true' }))}
                disabled={originalRole === 'SUPER_ADMIN'} className={`${selectCls} disabled:opacity-50`}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              {originalRole === 'SUPER_ADMIN' && (
                <p className="text-xs text-phm-gray-soft mt-1">El Super Admin no se puede desactivar aquí</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Correo electrónico *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>
              Nueva contraseña <span className="text-phm-gray-soft font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <div className="relative">
              <input name="password" type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={handleChange} placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm placeholder-phm-gray-soft focus:outline-none focus:border-phm-gold/40 transition-colors pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-phm-gray-soft hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showPassword
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  }
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Rol *</label>
            <div className="space-y-2">
              {ROLES_OPTIONS.map((r) => (
                <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  form.role === r.value
                    ? 'border-phm-red/60 bg-red-950/20'
                    : 'border-phm-border-soft bg-phm-surface hover:border-phm-gold/40'
                }`}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                    onChange={handleChange} className="mt-0.5 accent-red-700" />
                  <div>
                    <p className="text-sm font-medium text-white">{ROLE_LABELS[r.value]}</p>
                    <p className="text-xs text-phm-gray-soft">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}
          {success && <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-900/60 rounded-lg text-sm text-emerald-300">{success}</div>}

          <button type="submit" disabled={saving}
            className="w-full py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </PremiumCard>

      <Modal
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setDeleteError('') }}
        onConfirm={deleteError ? () => setShowDelete(false) : handleDelete}
        isLoading={deleting}
        title="¿Eliminar usuario?"
        description={deleteError || `Se eliminará permanentemente la cuenta de "${form.name}". Esta acción no se puede deshacer.`}
        confirmLabel={deleteError ? 'Cerrar' : 'Eliminar'}
      />
    </div>
  )
}
