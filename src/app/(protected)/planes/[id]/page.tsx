'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { planStatusBadge, paymentStatusBadge, contentStatusBadge, contentTypeBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Modal from '@/components/ui/Modal'
import { getMonthName, calculateCompliance, formatCurrency, MONTHS } from '@/lib/utils'

export default function PlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [plan, setPlan] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<any>({})

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    Promise.all([
      fetch(`/api/planes/${id}`).then((r) => r.json()),
      fetch('/api/clientes').then((r) => r.json()),
    ]).then(([planData, clientsData]) => {
      setPlan(planData)
      setClients(clientsData)
      setForm({
        clientId: planData.clientId,
        month: planData.month,
        year: planData.year,
        reelsCount: planData.reelsCount,
        carouselsCount: planData.carouselsCount,
        flyersCount: planData.flyersCount,
        monthlyPrice: planData.monthlyPrice,
        paymentStatus: planData.paymentStatus,
        planStatus: planData.planStatus,
        observations: planData.observations || '',
      })
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev: any) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/planes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setPlan((prev: any) => ({ ...prev, ...updated }))
        setSuccess('Plan actualizado correctamente')
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
      await fetch(`/api/planes/${id}`, { method: 'DELETE' })
      router.push('/planes')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>
  if (!plan) return <div className="text-red-400 text-sm py-10 text-center">Plan no encontrado</div>

  const compliance = calculateCompliance(plan, plan.contents || [])
  const totalContracted = form.reelsCount + form.carouselsCount + form.flyersCount

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/planes" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-50">
            {plan.client?.name} — {getMonthName(plan.month)} {plan.year}
          </h1>
          <p className="text-zinc-500 text-sm">{plan.client?.business}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/reportes/${id}`}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            Ver Reporte
          </Link>
          <button onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/50 hover:bg-red-950 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-100">Cumplimiento</h2>
          <div className="flex gap-2">
            {planStatusBadge(plan.planStatus)}
            {paymentStatusBadge(plan.paymentStatus)}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Reels', delivered: compliance.reelsDelivered, total: plan.reelsCount, color: 'text-purple-400' },
            { label: 'Carruseles', delivered: compliance.carouselsDelivered, total: plan.carouselsCount, color: 'text-blue-400' },
            { label: 'Flyers', delivered: compliance.flyersDelivered, total: plan.flyersCount, color: 'text-orange-400' },
            { label: 'Total', delivered: compliance.totalDelivered, total: compliance.totalContracted, color: 'text-zinc-300' },
          ].map((item) => (
            <div key={item.label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${item.color}`}>{item.delivered}/{item.total}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
        <ProgressBar value={compliance.compliancePercentage} size="md" />
      </div>

      {/* Edit Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold text-zinc-100 mb-5">Editar plan</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-1">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente</label>
              <select name="clientId" value={form.clientId} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mes</label>
              <select name="month" value={form.month} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Año</label>
              <select name="year" value={form.year} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'reelsCount', label: 'Reels', color: 'text-purple-400' },
              { name: 'carouselsCount', label: 'Carruseles', color: 'text-blue-400' },
              { name: 'flyersCount', label: 'Flyers', color: 'text-orange-400' },
            ].map((field) => (
              <div key={field.name} className="bg-zinc-800/50 rounded-lg p-4">
                <label className={`block text-xs font-medium mb-2 ${field.color}`}>{field.label}</label>
                <input name={field.name} type="number" min="0" value={form[field.name]} onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm text-center focus:outline-none focus:border-zinc-500" />
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">Total: <span className="text-zinc-300 font-medium">{totalContracted} contenidos</span></p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Precio (MXN)</label>
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
          {success && <div className="px-4 py-3 bg-green-950 border border-green-800 rounded-lg text-sm text-green-400">{success}</div>}

          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#8B0000' }}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* Contents List */}
      {plan.contents?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <h2 className="font-semibold text-zinc-100">Contenidos del Plan</h2>
            <Link href={`/contenidos/nuevo?planId=${id}&clientId=${plan.clientId}`}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">+ Agregar contenido</Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {plan.contents.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-center gap-3">
                  {contentTypeBadge(c.type)}
                  <p className="text-sm text-zinc-200">{c.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {contentStatusBadge(c.status)}
                  <Link href={`/contenidos/${c.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors ml-2">Editar →</Link>
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
        title="¿Eliminar plan?"
        description={`Se eliminará el plan de "${plan.client?.name}" (${getMonthName(plan.month)} ${plan.year}) y todos sus contenidos.`}
      />
    </div>
  )
}
