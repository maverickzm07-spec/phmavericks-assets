'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import { MONTHS } from '@/lib/utils'

function NuevoPlanForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultClientId = searchParams.get('clientId') || ''

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [form, setForm] = useState({
    clientId: defaultClientId,
    month: currentMonth,
    year: currentYear,
    reelsCount: 0,
    carouselsCount: 0,
    flyersCount: 0,
    monthlyPrice: 0,
    paymentStatus: 'PENDING',
    planStatus: 'IN_PROGRESS',
    observations: '',
  })

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/planes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { router.push('/planes') }
      else { const data = await res.json(); setError(data.error || 'Error al crear el plan') }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const years = [currentYear - 1, currentYear, currentYear + 1]
  const totalContracted = form.reelsCount + form.carouselsCount + form.flyersCount
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/planes" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Plan Mensual</h1>
          <p className="text-phm-gray-soft text-sm">Define el plan de contenidos para el mes</p>
        </div>
      </div>

      <PremiumCard padding="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Cliente *</label>
            <select name="clientId" value={form.clientId} onChange={handleChange} required className={selectCls}>
              <option value="">Selecciona un cliente</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mes *</label>
              <select name="month" value={form.month} onChange={handleChange} className={selectCls}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Año *</label>
              <select name="year" value={form.year} onChange={handleChange} className={selectCls}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Contenidos contratados</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'reelsCount', label: 'Reels', color: 'text-purple-400' },
                { name: 'carouselsCount', label: 'Carruseles', color: 'text-blue-400' },
                { name: 'flyersCount', label: 'Flyers', color: 'text-orange-400' },
              ].map((field) => (
                <div key={field.name} className="bg-phm-surface border border-phm-border-soft rounded-lg p-4">
                  <label className={`block text-xs font-semibold mb-2 ${field.color}`}>{field.label}</label>
                  <input name={field.name} type="number" min="0" value={(form as any)[field.name]} onChange={handleChange}
                    className="w-full px-3 py-2 bg-phm-charcoal border border-phm-border-soft rounded-lg text-white text-sm text-center focus:outline-none focus:border-phm-gold/40 transition-colors" />
                </div>
              ))}
            </div>
            <p className="text-xs text-phm-gray-soft mt-2">Total contratado: <span className="text-white font-medium">{totalContracted} contenidos</span></p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Precio mensual</label>
              <input name="monthlyPrice" type="number" min="0" value={form.monthlyPrice} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado de pago</label>
              <select name="paymentStatus" value={form.paymentStatus} onChange={handleChange} className={selectCls}>
                <option value="PENDING">Pendiente</option>
                <option value="PARTIAL">Parcial</option>
                <option value="PAID">Pagado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado del plan</label>
              <select name="planStatus" value={form.planStatus} onChange={handleChange} className={selectCls}>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="COMPLETED">Completado</option>
                <option value="DELAYED">Atrasado</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Plan'}
            </button>
            <Link href="/planes"
              className="px-6 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:border-phm-gold/40 rounded-lg transition-all text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </PremiumCard>
    </div>
  )
}

export default function NuevoPlanPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <div className="h-96 skeleton-shimmer rounded-2xl" />
      </div>
    }>
      <NuevoPlanForm />
    </Suspense>
  )
}
