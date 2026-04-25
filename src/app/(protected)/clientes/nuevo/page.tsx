'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ServicePlan {
  id: string
  nombre: string
  tipo: string
  precio: number
}

const TIPO_LABEL: Record<string, string> = {
  CONTENIDO: 'Contenido',
  IA: 'IA',
  FOTOGRAFIA: 'Fotografía',
  PERSONALIZADO: 'Personalizado',
}

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [form, setForm] = useState({
    name: '',
    business: '',
    contact: '',
    whatsapp: '',
    email: '',
    status: 'ACTIVE',
    notes: '',
    servicePlanId: '',
  })

  useEffect(() => {
    fetch('/api/servicios')
      .then((r) => r.json())
      .then((d) => setServicePlans(Array.isArray(d) ? d : []))
      .catch(() => setServicePlans([]))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        router.push('/clientes')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear el cliente')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nuevo Cliente</h1>
          <p className="text-zinc-500 text-sm">Registra un nuevo cliente en el sistema</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nombre del cliente *</label>
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
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Persona de contacto</label>
              <input name="contact" value={form.contact} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">WhatsApp</label>
              <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+521234567890"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notas</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              placeholder="Información adicional sobre el cliente, preferencias, etc."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-all resize-none" />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: '#8B0000' }}>
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
            <Link href="/clientes"
              className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
