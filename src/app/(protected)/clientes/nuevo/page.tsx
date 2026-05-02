'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', business: '', contact: '', whatsapp: '', email: '', status: 'ACTIVE', notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { router.push('/clientes') }
      else { const data = await res.json(); setError(data.error || 'Error al crear el cliente') }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Cliente</h1>
          <p className="text-phm-gray-soft text-sm">Registra un nuevo cliente en el sistema</p>
        </div>
      </div>

      <PremiumCard padding="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre del cliente *</label>
              <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Marca / Negocio *</label>
              <input name="business" value={form.business} onChange={handleChange} required className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Persona de contacto</label>
              <input name="contact" value={form.contact} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+521234567890" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="status" value={form.status} onChange={handleChange} className={selectCls}>
                <option value="ACTIVE">Activo</option>
                <option value="PAUSED">Pausado</option>
                <option value="FINISHED">Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              placeholder="Información adicional sobre el cliente, preferencias, etc."
              className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
            <Link href="/clientes"
              className="px-6 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:border-phm-gold/40 rounded-lg transition-all text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </PremiumCard>
    </div>
  )
}
