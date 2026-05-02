'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { clientStatusBadge, planStatusBadge, paymentStatusBadge } from '@/components/ui/Badge'
import PremiumCard from '@/components/ui/PremiumCard'
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
  cantidadImagenesFlyers: number
}

interface IngresoCliente {
  id: string
  tipoServicio: string
  descripcion: string | null
  monto: number
  montoPagado: number
  saldoPendiente: number
  porcentajePagado: number
  estadoPago: 'PAGADO' | 'PARCIAL' | 'PENDIENTE'
  metodoPago: string | null
  fechaIngreso: string
  observaciones: string | null
  _count: { abonos: number }
}

const TIPO_LABEL: Record<string, string> = {
  CONTENIDO: 'Contenido',
  IA: 'IA',
  FOTOGRAFIA: 'Fotografía',
  PERSONALIZADO: 'Personalizado',
}

const TIPO_SERVICIO_LABEL: Record<string, string> = {
  FOTOGRAFIA: 'Fotografía',
  REELS: 'Reels',
  VIDEOS_HORIZONTALES: 'Videos Horizontales',
  IMAGENES_FLYERS: 'Imágenes / Flyers',
  PLAN_MENSUAL: 'Plan Mensual',
  PERSONALIZADO: 'Personalizado',
}

const ESTADO_BADGE: Record<string, string> = {
  PAGADO: 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60',
  PARCIAL: 'bg-amber-950/60 text-amber-400 border border-amber-900/60',
  PENDIENTE: 'bg-red-950/60 text-red-400 border border-red-900/60',
}

const ESTADO_LABEL: Record<string, string> = {
  PAGADO: 'Pagado',
  PARCIAL: 'Parcial',
  PENDIENTE: 'Pendiente',
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
  const [ingresos, setIngresos] = useState<IngresoCliente[]>([])
  const [ingresosTotales, setIngresosTotales] = useState<any>(null)
  const [loadingIngresos, setLoadingIngresos] = useState(false)
  const [canVerIngresos, setCanVerIngresos] = useState(false)
  const [form, setForm] = useState({
    name: '', business: '', contact: '', whatsapp: '', email: '', status: 'ACTIVE', notes: '',
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((u) => { if (['SUPER_ADMIN', 'ADMIN'].includes(u?.role)) setCanVerIngresos(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id || !canVerIngresos) return
    setLoadingIngresos(true)
    fetch(`/api/ingresos?clienteId=${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setIngresos(d.ingresos || []); setIngresosTotales(d.totales || null) } })
      .catch(() => {})
      .finally(() => setLoadingIngresos(false))
  }, [id, canVerIngresos])

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetch(`/api/clientes/${id}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data) => {
        setClient(data)
        setForm({
          name: data.name || '', business: data.business || '', contact: data.contact || '',
          whatsapp: data.whatsapp || '', email: data.email || '', status: data.status || 'ACTIVE',
          notes: data.notes || '',
        })
      })
      .catch(() => setClient(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { setSuccess('Cliente actualizado correctamente'); setTimeout(() => setSuccess(''), 3000) }
      else { const data = await res.json(); setError(data.error || 'Error al actualizar') }
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await fetch(`/api/clientes/${id}`, { method: 'DELETE' }); router.push('/clientes') }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="max-w-4xl space-y-4">
      <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
      <div className="h-48 skeleton-shimmer rounded-2xl" />
      <div className="h-64 skeleton-shimmer rounded-2xl" />
    </div>
  )
  if (!client) return <PremiumCard padding="lg" className="text-center"><p className="text-phm-gray">Cliente no encontrado.</p></PremiumCard>

  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{client.name}</h1>
          <p className="text-phm-gray-soft text-sm">{client.business}</p>
        </div>
        <div className="flex items-center gap-2">
          {clientStatusBadge(client.status)}
          <button onClick={() => setShowDelete(true)}
            className="px-3 py-2 text-sm font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
            Eliminar
          </button>
        </div>
      </div>

      {/* Formulario de edición */}
      <PremiumCard padding="md">
        <h2 className="font-semibold text-white mb-5">Información del cliente</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Marca / Negocio *</label>
              <input name="business" value={form.business} onChange={handleChange} required className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contacto</label>
              <input name="contact" value={form.contact} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input name="whatsapp" value={form.whatsapp} onChange={handleChange} className={inputCls} />
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
            <label className={labelCls}>Servicio asignado</label>
            {client?.servicePlan ? (
              <div className="px-4 py-3 bg-phm-surface border border-phm-border-soft rounded-lg space-y-1">
                <p className="text-sm text-white font-medium">{client.servicePlan.nombre}</p>
                <p className="text-xs text-phm-gray-soft">
                  <span className="text-phm-gold">${client.servicePlan.precio}</span>
                  {' · '}{TIPO_LABEL[client.servicePlan.tipo]}
                </p>
                <div className="flex gap-3 flex-wrap text-xs text-phm-gray-soft mt-1">
                  {client.servicePlan.cantidadReels > 0 && <span><span className="text-purple-400">▶</span> {client.servicePlan.cantidadReels} reels</span>}
                  {client.servicePlan.cantidadVideosHorizontales > 0 && <span><span className="text-emerald-400">▬</span> {client.servicePlan.cantidadVideosHorizontales} videos horiz.</span>}
                  {client.servicePlan.cantidadFotos > 0 && <span><span className="text-amber-400">◆</span> {client.servicePlan.cantidadFotos} fotos</span>}
                  {client.servicePlan.cantidadImagenesFlyers > 0 && <span><span className="text-pink-400">◈</span> {client.servicePlan.cantidadImagenesFlyers} imgs/flyers</span>}
                </div>
                <p className="text-xs text-phm-gray-soft mt-1">Para cambiar el servicio, usa <span className="text-phm-gold">Asignar a cliente</span> en la sección Servicios.</p>
              </div>
            ) : (
              <div className="px-4 py-3 bg-phm-surface border border-phm-border-soft rounded-lg">
                <p className="text-sm text-phm-gray-soft">Sin servicio asignado. Usa <span className="text-phm-gold">Asignar a cliente</span> en la sección Servicios.</p>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Notas</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
          </div>
          {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}
          {success && <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-900/60 rounded-lg text-sm text-emerald-300">{success}</div>}
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </PremiumCard>

      {/* Acciones rápidas */}
      <div className="flex gap-3 flex-wrap">
        <Link href={`/ingresos?clienteId=${client.id}&create=1`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
          + Registrar ingreso
        </Link>
        <Link href={`/ingresos?clienteId=${client.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-phm-gray border border-phm-border-soft hover:border-phm-gold/40 hover:text-white rounded-lg transition-all">
          Ver todos los ingresos <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Ingresos del cliente */}
      {canVerIngresos && (
        <PremiumCard padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-phm-border-soft">
            <h2 className="font-semibold text-white">Ingresos del cliente</h2>
            <Link href={`/ingresos?clienteId=${client.id}`}
              className="text-sm text-phm-gray hover:text-phm-gold transition-colors">Ver todos →</Link>
          </div>

          {loadingIngresos ? (
            <div className="p-6 space-y-3">
              <div className="h-10 skeleton-shimmer rounded-lg" />
              <div className="h-10 skeleton-shimmer rounded-lg" />
            </div>
          ) : ingresos.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-phm-gray-soft text-sm mb-3">Este cliente no tiene ingresos registrados.</p>
              <Link href={`/ingresos?clienteId=${client.id}&create=1`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
                + Registrar primer ingreso
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 divide-x divide-phm-border-soft border-b border-phm-border-soft">
                <div className="p-4 text-center">
                  <p className="text-xs text-phm-gray-soft mb-1">Total contratado</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(ingresos.reduce((s, i) => s + i.monto, 0))}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-phm-gray-soft mb-1">Total abonado</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(ingresos.reduce((s, i) => s + i.montoPagado, 0))}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-phm-gray-soft mb-1">Saldo pendiente</p>
                  <p className="text-lg font-bold text-amber-400">{formatCurrency(ingresos.reduce((s, i) => s + i.saldoPendiente, 0))}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-phm-border-soft bg-white/[0.015]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Fecha</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Servicio</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Monto</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Abonado</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Saldo</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Estado</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft">Abonos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-phm-border-soft">
                    {ingresos.map((ingreso) => (
                      <tr key={ingreso.id} className="row-hover">
                        <td className="px-5 py-3 text-phm-gray whitespace-nowrap">
                          {new Date(ingreso.fechaIngreso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{TIPO_SERVICIO_LABEL[ingreso.tipoServicio] || ingreso.tipoServicio}</p>
                          {ingreso.descripcion && <p className="text-phm-gray-soft text-xs mt-0.5">{ingreso.descripcion}</p>}
                        </td>
                        <td className="px-5 py-3 text-right text-white font-medium tabular-nums">{formatCurrency(ingreso.monto)}</td>
                        <td className="px-5 py-3 text-right text-emerald-400 tabular-nums">{formatCurrency(ingreso.montoPagado)}</td>
                        <td className="px-5 py-3 text-right text-amber-400 tabular-nums">{formatCurrency(ingreso.saldoPendiente)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[ingreso.estadoPago]}`}>
                            {ESTADO_LABEL[ingreso.estadoPago]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-xs text-phm-gray-soft">{ingreso._count.abonos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PremiumCard>
      )}

      {/* Planes mensuales */}
      {client.monthlyPlans?.length > 0 && (
        <PremiumCard padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-phm-border-soft">
            <h2 className="font-semibold text-white">Planes Mensuales</h2>
            <Link href={`/planes/nuevo?clientId=${client.id}`}
              className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">+ Nuevo plan</Link>
          </div>
          <div className="divide-y divide-phm-border-soft">
            {client.monthlyPlans.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between px-5 py-3.5 row-hover">
                <div>
                  <p className="text-sm font-medium text-white">{getMonthName(plan.month)} {plan.year}</p>
                  <p className="text-xs text-phm-gray-soft">{plan._count?.contents || 0} contenidos · {formatCurrency(plan.monthlyPrice)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {planStatusBadge(plan.planStatus)}
                  {paymentStatusBadge(plan.paymentStatus)}
                  <Link href={`/planes/${plan.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-phm-gray hover:text-phm-gold transition-colors ml-2">
                    Ver <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>
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
