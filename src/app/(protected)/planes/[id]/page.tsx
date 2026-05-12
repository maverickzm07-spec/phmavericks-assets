'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Plus, X } from 'lucide-react'
import { planStatusBadge, paymentStatusBadge, contentStatusBadge, contentTypeBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Modal from '@/components/ui/Modal'
import PremiumCard from '@/components/ui/PremiumCard'
import DeliverySection from '@/components/ui/DeliverySection'
import { getMonthName, calculateCompliance, MONTHS } from '@/lib/utils'

export default function PlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [plan, setPlan]         = useState<any>(null)
  const [clients, setClients]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm]         = useState<any>({})
  const [canAdmin, setCanAdmin] = useState(false)

  // Estado económico reactivo
  const [totalPagado, setTotalPagado]       = useState(0)
  const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null)
  const [estadoEc, setEstadoEc]             = useState('SIN_PRECIO')

  // Formulario de pago
  const [showPagoForm, setShowPagoForm]       = useState(false)
  const [registrandoPago, setRegistrandoPago] = useState(false)
  const [pagoError, setPagoError]             = useState('')
  const [pagoForm, setPagoForm] = useState({
    monto: '',
    metodoPago: '',
    fechaPago: new Date().toISOString().split('T')[0],
    observacion: '',
  })

  // Editar precio final inline
  const [editandoPrecio, setEditandoPrecio]   = useState(false)
  const [precioFinalEdit, setPrecioFinalEdit] = useState('')
  const [guardandoPrecio, setGuardandoPrecio] = useState(false)

  const fmt = (v: number) => `$${v.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`
  const METODOS_PAGO = ['EFECTIVO','TRANSFERENCIA','DEPOSITO','TARJETA','OTRO']

  const syncEconomico = (data: any) => {
    const tp = data.totalPagado ?? (data.ingresos ?? []).reduce((s: number, i: any) => s + i.montoPagado, 0)
    setTotalPagado(tp)
    setSaldoPendiente(data.saldoPendiente ?? null)
    setEstadoEc(data.estadoEconomico ?? 'SIN_PRECIO')
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : null)
      .then((u) => { if (['SUPER_ADMIN', 'ADMIN'].includes(u?.role)) setCanAdmin(true) })
      .catch(() => {})
  }, [])

  const fetchPlan = () => {
    Promise.all([
      fetch(`/api/planes/${id}`).then(r => r.json()),
      fetch('/api/clientes').then(r => r.json()),
    ]).then(([planData, clientsData]) => {
      setPlan(planData)
      setClients(clientsData)
      setPrecioFinalEdit(String(planData.precioFinal ?? planData.monthlyPrice ?? ''))
      syncEconomico(planData)
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
        deliveryLink: planData.deliveryLink || '',
        observations: planData.observations || '',
        precioFinal: planData.precioFinal ?? null,
      })
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPlan() }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev: any) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
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
        const data = await res.json(); setError(data.error || 'Error al actualizar')
      }
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  const guardarPrecioFinal = async () => {
    const val = parseFloat(precioFinalEdit)
    if (isNaN(val) || val < 0) return
    setGuardandoPrecio(true)
    const res = await fetch(`/api/planes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, precioFinal: val }),
    })
    if (res.ok) { fetchPlan(); setEditandoPrecio(false) }
    setGuardandoPrecio(false)
  }

  const registrarPago = async () => {
    const monto = parseFloat(pagoForm.monto)
    if (!monto || monto <= 0) { setPagoError('Ingresa un monto válido'); return }
    setRegistrandoPago(true); setPagoError('')
    const res = await fetch(`/api/planes/${id}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto,
        metodoPago: pagoForm.metodoPago || null,
        fechaPago: pagoForm.fechaPago || null,
        observacion: pagoForm.observacion || null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      syncEconomico(data.resumen)
      fetchPlan()
      setShowPagoForm(false)
      setPagoForm({ monto: '', metodoPago: '', fechaPago: new Date().toISOString().split('T')[0], observacion: '' })
    } else {
      setPagoError(data.error || 'Error al registrar pago')
    }
    setRegistrandoPago(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await fetch(`/api/planes/${id}`, { method: 'DELETE' }); router.push('/planes') }
    finally { setDeleting(false) }
  }

  // Guarda solo el link de entrega, enviando el resto del formulario intacto
  const saveDeliveryLink = async (link: string) => {
    const res = await fetch(`/api/planes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, deliveryLink: link || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlan((prev: any) => ({ ...prev, deliveryLink: updated.deliveryLink }))
      setForm((prev: any) => ({ ...prev, deliveryLink: link }))
    }
  }

  if (loading) return (
    <div className="max-w-4xl space-y-4">
      <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
      <div className="h-36 skeleton-shimmer rounded-2xl" />
      <div className="h-64 skeleton-shimmer rounded-2xl" />
    </div>
  )
  if (!plan) return (
    <PremiumCard padding="lg" className="text-center">
      <p className="text-phm-gray">Plan no encontrado.</p>
    </PremiumCard>
  )

  const compliance      = calculateCompliance(plan, plan.contents || [])
  const totalContracted = form.reelsCount + form.carouselsCount + form.flyersCount
  const inputCls  = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls  = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/planes" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {plan.client?.name} — {getMonthName(plan.month)} {plan.year}
          </h1>
          <p className="text-phm-gray-soft text-sm">{plan.client?.business}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/reportes/${id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-phm-gray hover:text-phm-gold transition-colors px-3 py-2 border border-phm-border-soft hover:border-phm-gold/40 rounded-lg">
            Ver Reporte <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => setShowDelete(true)}
            className="px-3 py-2 text-sm font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </div>

      {/* Cumplimiento */}
      <PremiumCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Cumplimiento</h2>
          <div className="flex gap-2">
            {planStatusBadge(plan.planStatus)}
            {paymentStatusBadge(plan.paymentStatus)}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Reels',      delivered: compliance.reelsDelivered,     total: plan.reelsCount,      color: 'text-purple-400' },
            { label: 'Carruseles', delivered: compliance.carouselsDelivered,  total: plan.carouselsCount,  color: 'text-blue-400'   },
            { label: 'Flyers',     delivered: compliance.flyersDelivered,     total: plan.flyersCount,     color: 'text-orange-400' },
            { label: 'Total',      delivered: compliance.totalDelivered,      total: compliance.totalContracted, color: 'text-white' },
          ].map((item) => (
            <div key={item.label} className="bg-phm-surface border border-phm-border-soft rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${item.color}`}>{item.delivered}/{item.total}</p>
              <p className="text-xs text-phm-gray-soft mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
        <ProgressBar value={compliance.compliancePercentage} size="md" />
      </PremiumCard>

      {/* Estado Económico */}
      {(() => {
        const ingresos: any[] = plan.ingresos ?? []
        const badgeEc = ({
          SIN_PRECIO: 'bg-phm-surface text-phm-gray-soft border border-phm-border-soft',
          SIN_PAGO:   'bg-red-950/60 text-red-300 border border-red-900/40',
          ABONADO:    'bg-yellow-950/60 text-yellow-300 border border-yellow-900/40',
          PAGADO:     'bg-emerald-950/60 text-emerald-300 border border-emerald-900/40',
        } as Record<string,string>)[estadoEc] ?? 'bg-phm-surface text-phm-gray-soft'
        const labelEc = ({ SIN_PRECIO: 'Sin precio', SIN_PAGO: 'Sin pago', ABONADO: 'Abonado', PAGADO: 'Pagado completo' } as Record<string,string>)[estadoEc] ?? estadoEc

        return (
          <PremiumCard padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Estado Económico</h2>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badgeEc}`}>{labelEc}</span>
                {canAdmin && (
                  <button onClick={() => setShowPagoForm(v => !v)}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-phm-gold/10 hover:bg-phm-gold/20 text-phm-gold border border-phm-gold/30 rounded-lg transition-all">
                    {showPagoForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {showPagoForm ? 'Cancelar' : 'Registrar pago'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-phm-surface border border-phm-border-soft rounded-lg p-3 text-center">
                <p className="text-xs text-phm-gray-soft mb-1">Precio base</p>
                <p className="text-base font-bold text-phm-gray">{plan.precioBase != null ? fmt(plan.precioBase) : fmt(plan.monthlyPrice)}</p>
              </div>
              <div className="bg-phm-surface border border-phm-border-soft rounded-lg p-3 text-center">
                <p className="text-xs text-phm-gray-soft mb-1">Precio final</p>
                {editandoPrecio ? (
                  <div className="flex items-center gap-1 justify-center">
                    <input type="number" min="0" value={precioFinalEdit}
                      onChange={e => setPrecioFinalEdit(e.target.value)}
                      className="w-20 px-2 py-1 bg-phm-charcoal border border-phm-gold/40 rounded text-white text-sm text-center focus:outline-none"
                      autoFocus onKeyDown={e => { if (e.key === 'Enter') guardarPrecioFinal(); if (e.key === 'Escape') setEditandoPrecio(false) }}
                    />
                    <button onClick={guardarPrecioFinal} disabled={guardandoPrecio} className="text-xs text-emerald-400 hover:text-emerald-300">✓</button>
                    <button onClick={() => setEditandoPrecio(false)} className="text-xs text-phm-gray-soft hover:text-white">✕</button>
                  </div>
                ) : (
                  <p className="text-base font-bold text-phm-gold cursor-pointer hover:text-phm-gold-bright"
                    onClick={() => canAdmin && setEditandoPrecio(true)}>
                    {(plan.precioFinal ?? plan.monthlyPrice) > 0 ? fmt(plan.precioFinal ?? plan.monthlyPrice) : <span className="text-phm-gray-soft text-sm">Definir</span>}
                  </p>
                )}
              </div>
              <div className="bg-phm-surface border border-phm-border-soft rounded-lg p-3 text-center">
                <p className="text-xs text-phm-gray-soft mb-1">Total pagado</p>
                <p className="text-base font-bold text-emerald-400">{fmt(totalPagado)}</p>
              </div>
            </div>

            {saldoPendiente != null && (
              <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-phm-surface border border-phm-border-soft">
                <span className="text-xs text-phm-gray-soft">Saldo pendiente</span>
                <span className={`text-sm font-semibold ${saldoPendiente > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {saldoPendiente > 0 ? fmt(saldoPendiente) : 'Saldado ✓'}
                </span>
              </div>
            )}

            {/* Formulario de pago */}
            {showPagoForm && (
              <div className="mt-4 pt-4 border-t border-phm-border-soft">
                <p className="text-xs font-medium text-phm-gray-soft uppercase tracking-wide mb-3">Registrar pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-phm-gray-soft mb-1">Monto *</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={pagoForm.monto} onChange={e => setPagoForm(p => ({ ...p, monto: e.target.value }))}
                      className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-phm-gray-soft mb-1">Método de pago</label>
                    <select value={pagoForm.metodoPago} onChange={e => setPagoForm(p => ({ ...p, metodoPago: e.target.value }))}
                      className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors">
                      <option value="">— Sin especificar —</option>
                      {METODOS_PAGO.map(m => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-phm-gray-soft mb-1">Fecha de pago</label>
                    <input type="date" value={pagoForm.fechaPago}
                      onChange={e => setPagoForm(p => ({ ...p, fechaPago: e.target.value }))}
                      className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-phm-gray-soft mb-1">Observación</label>
                    <input type="text" placeholder="Opcional"
                      value={pagoForm.observacion} onChange={e => setPagoForm(p => ({ ...p, observacion: e.target.value }))}
                      className="w-full px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors" />
                  </div>
                </div>
                {pagoError && <p className="mt-2 text-xs text-red-400">{pagoError}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={registrarPago} disabled={registrandoPago}
                    className="px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
                    {registrandoPago ? 'Guardando...' : 'Guardar pago'}
                  </button>
                  <button onClick={() => { setShowPagoForm(false); setPagoError('') }}
                    className="px-4 py-2 text-sm text-phm-gray-soft hover:text-white transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Historial de pagos */}
            {ingresos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-phm-border-soft space-y-2">
                <p className="text-xs font-medium text-phm-gray-soft uppercase tracking-wide">Historial de pagos</p>
                {ingresos.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-phm-surface border border-phm-border-soft">
                    <div className="text-xs text-phm-gray">
                      <span>{new Date(i.fechaIngreso).toLocaleDateString('es-CO')}</span>
                      {i.metodoPago && <span className="ml-2 text-phm-gray-soft">· {i.metodoPago.charAt(0) + i.metodoPago.slice(1).toLowerCase()}</span>}
                      {i.observaciones && <span className="ml-2 text-phm-gray-soft">· {i.observaciones}</span>}
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">{fmt(i.montoPagado)}</span>
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>
        )
      })()}

      {/* Entrega del cliente */}
      <PremiumCard padding="md">
        <h2 className="font-semibold text-white mb-5">Entrega del cliente</h2>
        <DeliverySection
          initialLink={plan.deliveryLink ?? null}
          onSave={saveDeliveryLink}
          canAdmin={canAdmin}
          clientId={plan.clientId}
          entityType="MONTHLY_PLAN"
          entityId={id}
          existingAccess={plan.deliveryAccesses?.[0] ?? null}
        />
      </PremiumCard>

      {/* Editar plan */}
      <PremiumCard padding="md">
        <h2 className="font-semibold text-white mb-5">Editar plan</h2>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Cliente</label>
              <select name="clientId" value={form.clientId} onChange={handleChange} className={selectCls}>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Mes</label>
              <select name="month" value={form.month} onChange={handleChange} className={selectCls}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Año</label>
              <select name="year" value={form.year} onChange={handleChange} className={selectCls}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'reelsCount',     label: 'Reels',      color: 'text-purple-400' },
              { name: 'carouselsCount', label: 'Carruseles', color: 'text-blue-400'   },
              { name: 'flyersCount',    label: 'Flyers',     color: 'text-orange-400' },
            ].map((field) => (
              <div key={field.name} className="bg-phm-surface border border-phm-border-soft rounded-lg p-4">
                <label className={`block text-xs font-semibold mb-2 ${field.color}`}>{field.label}</label>
                <input name={field.name} type="number" min="0" value={form[field.name]}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-phm-charcoal border border-phm-border-soft rounded-lg text-white text-sm text-center focus:outline-none focus:border-phm-gold/40 transition-colors" />
              </div>
            ))}
          </div>
          <p className="text-xs text-phm-gray-soft">
            Total: <span className="text-white font-medium">{totalContracted} contenidos</span>
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Precio</label>
              <input name="monthlyPrice" type="number" min="0" value={form.monthlyPrice}
                onChange={handleChange} className={inputCls} />
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

          {error   && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}
          {success && <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-900/60 rounded-lg text-sm text-emerald-300">{success}</div>}

          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </PremiumCard>

      {/* Contenidos del plan (solo producción interna) */}
      {plan.contents?.length > 0 && (
        <PremiumCard padding="none">
          <div className="flex items-center justify-between p-5 border-b border-phm-border-soft">
            <div>
              <h2 className="font-semibold text-white">Contenidos</h2>
              <p className="text-xs text-phm-gray-soft mt-0.5">Seguimiento interno de producción</p>
            </div>
            <Link href={`/contenidos/nuevo?planId=${id}&clientId=${plan.clientId}`}
              className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">
              + Agregar
            </Link>
          </div>
          <div className="divide-y divide-phm-border-soft">
            {plan.contents.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 row-hover">
                <div className="flex items-center gap-3">
                  {contentTypeBadge(c.type)}
                  <p className="text-sm text-white">{c.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {contentStatusBadge(c.status)}
                  <Link href={`/contenidos/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors ml-2">
                    Editar <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        isLoading={deleting}
        title="¿Eliminar plan?"
        description={`Se eliminará el plan de "${plan.client?.name}" (${getMonthName(plan.month)} ${plan.year}) y todos sus contenidos.`}
      />
    </div>
  )
}
