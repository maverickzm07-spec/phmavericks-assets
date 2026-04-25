'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/planes')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear el plan')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const years = [currentYear - 1, currentYear, currentYear + 1]
  const totalContracted = form.reelsCount + form.carouselsCount + form.flyersCount

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/planes" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nuevo Plan Mensual</h1>
          <p className="text-zinc-500 text-sm">Define el plan de contenidos para el mes</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente *</label>
            <select name="clientId" value={form.clientId} onChange={handleChange} required
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
              <option value="">Selecciona un cliente</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} — {c.business}</option>
              ))}
            </select>
          </div>

          {/* Mes y Año */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mes *</label>
              <select name="month" value={form.month} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Año *</label>
              <select name="year" value={form.year} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Contenidos contratados */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Contenidos contratados</label>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <label className="block text-xs text-purple-400 font-medium mb-2">Reels</label>
                <input name="reelsCount" type="number" min="0" value={form.reelsCount} onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm text-center focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <label className="block text-xs text-blue-400 font-medium mb-2">Carruseles</label>
                <input name="carouselsCount" type="number" min="0" value={form.carouselsCount} onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm text-center focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <label className="block text-xs text-orange-400 font-medium mb-2">Flyers</label>
                <input name="flyersCount" type="number" min="0" value={form.flyersCount} onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm text-center focus:outline-none focus:border-zinc-500" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Total contratado: <span className="text-zinc-300 font-medium">{totalContracted} contenidos</span></p>
          </div>

          {/* Precio y estados */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Precio mensual (MXN)</label>
              <input name="monthlyPrice" type="number" min="0" value={form.monthlyPrice} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado de pago</label>
              <select name="paymentStatus" value={form.paymentStatus} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="PENDING">Pendiente</option>
                <option value="PARTIAL">Parcial</option>
                <option value="PAID">Pagado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado del plan</label>
              <select name="planStatus" value={form.planStatus} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="COMPLETED">Completado</option>
                <option value="DELAYED">Atrasado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Observaciones</label>
            <textarea name="observations" value={form.observations} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#8B0000' }}>
              {loading ? 'Guardando...' : 'Guardar Plan'}
            </button>
            <Link href="/planes"
              className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NuevoPlanPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>}>
      <NuevoPlanForm />
    </Suspense>
  )
}
