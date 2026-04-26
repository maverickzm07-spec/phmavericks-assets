'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Client } from '@/types'
import { clientStatusBadge, planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import { getMonthName, formatCurrency } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

interface ServicePlan {
  id: string
  nombre: string
  tipo: string
  precio: number
  cantidadReels: number
  cantidadVideosHorizontales: number
  cantidadFotos: number
}

const TIPO_LABEL: Record<string, string> = {
  CONTENIDO: 'Contenido',
  IA: 'IA',
  FOTOGRAFIA: 'Fotografía',
  PERSONALIZADO: 'Personalizado',
}

export default function ClienteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [form, setForm] = useState({
    name: '', business: '', contact: '', whatsapp: '', email: '', status: 'ACTIVE', notes: '', servicePlanId: '',
  })

  useEffect(() => {
    fetch('/api/servicios')
      .then((r) => r.json())
      .then((d) => setServicePlans(Array.isArray(d) ? d : []))
      .catch(() => setServicePlans([]))
  }, [])

  useEffect(() => {
    fetch(`/api/clientes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data)
        setForm({
          name: data.name || '',
          business: data.business || '',
          contact: data.contact || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          status: data.status || 'ACTIVE',
          notes: data.notes || '',
          servicePlanId: data.servicePlanId || '',
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSuccess('Cliente actualizado correctamente')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al actualizar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
      router.push('/clientes')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>
  if (!client) return <div className="text-red-400 text-sm py-10 text-center">Cliente no encontrado</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-50">{client.name}</h1>
          <p className="text-zinc-500 text-sm">{client.business}</p>
        </div>
        <div className="flex items-center gap-3">
          {clientStatusBadge(client.status)}
          <button onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold text-zinc-100 mb-5">Información del cliente</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Marca / Negocio *</label>
              <input name="business" value={form.business} onChange={handleChange} required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Contacto</label>
              <input name="contact" value={form.contact} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">WhatsApp</label>
              <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 transition-all">
                <option value="ACTIVE">Activo</option>
                <option value="PAUSED">Pausado</option>
                <option value="FINISHED">Finalizado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Plan o servicio asignado</label>
            <select
              name="servicePlanId"
              value={form.servicePlanId}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 transition-all"
            >
              <option value="">Sin plan asignado</option>
              {['CONTENIDO', 'IA', 'FOTOGRAFIA', 'PERSONALIZADO'].map((tipo) => {
                const group = servicePlans.filter((p) => p.tipo === tipo)
                if (group.length === 0) return null
                return (
                  <optgroup key={tipo} label={TIPO_LABEL[tipo]}>
                    {group.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.precio}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            {client?.servicePlan && (
              <div className="mt-1.5 space-y-1">
                <p className="text-xs text-zinc-500">
                  Actual: <span className="text-zinc-300">{client.servicePlan.nombre}</span>
                  {' · '}<span className="text-zinc-400">${client.servicePlan.precio}</span>
                  {' · '}<span className="text-zinc-500">{TIPO_LABEL[client.servicePlan.tipo]}</span>
                </p>
                <div className="flex gap-3 flex-wrap text-xs text-zinc-500">
                  {client.servicePlan.cantidadReels > 0 && (
                    <span><span className="text-purple-400">▶</span> {client.servicePlan.cantidadReels} reels</span>
                  )}
                  {client.servicePlan.cantidadVideosHorizontales > 0 && (
                    <span><span className="text-green-400">▬</span> {client.servicePlan.cantidadVideosHorizontales} videos horizontales</span>
                  )}
                  {client.servicePlan.cantidadFotos > 0 && (
                    <span><span className="text-amber-400">◆</span> {client.servicePlan.cantidadFotos} fotos</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notas</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all resize-none" />
          </div>
          {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}
          {success && <div className="px-4 py-3 bg-green-950 border border-green-800 rounded-lg text-sm text-green-400">{success}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: '#8B0000' }}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Plans List */}
      {client.monthlyPlans?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <h2 className="font-semibold text-zinc-100">Planes Mensuales</h2>
            <Link href={`/planes/nuevo?clientId=${client.id}`}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">+ Nuevo plan</Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {client.monthlyPlans.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{getMonthName(plan.month)} {plan.year}</p>
                  <p className="text-xs text-zinc-500">{plan._count?.contents || 0} contenidos · {formatCurrency(plan.monthlyPrice)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {planStatusBadge(plan.planStatus)}
                  {paymentStatusBadge(plan.paymentStatus)}
                  <Link href={`/planes/${plan.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors ml-2">Ver →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="¿Eliminar cliente?"
        description={`Se eliminará "${client.name}" junto con todos sus planes y contenidos. Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
