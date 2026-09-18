'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, X } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import { getMonthName } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'FOTO', label: 'Foto' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'OTRO', label: 'Otro' },
]

const FORMATOS = [
  { value: 'VERTICAL_9_16', label: 'Vertical 9:16' },
  { value: 'HORIZONTAL_16_9', label: 'Horizontal 16:9' },
  { value: 'CUADRADO_1_1', label: 'Cuadrado 1:1' },
  { value: 'NO_APLICA', label: 'No aplica' },
]

interface Entregable {
  type: string
  formato: string
  title: string
}

function NuevoProyectoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [clients, setClients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    serviceId: searchParams.get('serviceId') || '',
    monthlyPlanId: '',
    nombre: '',
    modalidad: 'OCASIONAL',
    estado: 'PENDIENTE',
    linkEntrega: '',
    fechaEntrega: '',
    observaciones: '',
  })

  const [entregables, setEntregables] = useState<Entregable[]>([
    { type: 'VIDEO', formato: 'VERTICAL_9_16', title: '' },
  ])

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients).catch(() => {})
    fetch('/api/servicios').then((r) => r.json()).then(setServices).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.clientId) {
      fetch(`/api/planes?clientId=${form.clientId}`).then((r) => r.ok ? r.json() : []).then((d) => setPlans(Array.isArray(d) ? d : [])).catch(() => setPlans([]))
    } else { setPlans([]) }
  }, [form.clientId])

  useEffect(() => {
    if (!form.serviceId) return
    const svc = services.find((s) => s.id === form.serviceId)
    if (!svc) return
    const auto: Entregable[] = []
    for (let i = 0; i < svc.cantidadReels; i++) auto.push({ type: 'VIDEO', formato: 'VERTICAL_9_16', title: `Video ${i + 1}` })
    for (let i = 0; i < svc.cantidadVideosHorizontales; i++) auto.push({ type: 'VIDEO', formato: 'HORIZONTAL_16_9', title: `Video horizontal ${i + 1}` })
    for (let i = 0; i < svc.cantidadFotos; i++) auto.push({ type: 'FOTO', formato: 'NO_APLICA', title: `Foto ${i + 1}` })
    for (let i = 0; i < svc.cantidadImagenesFlyers; i++) auto.push({ type: 'FLYER', formato: 'CUADRADO_1_1', title: `Flyer ${i + 1}` })
    if (auto.length > 0) setEntregables(auto)
    if (svc.modalidad) setForm((f) => ({ ...f, modalidad: svc.modalidad }))
  }, [form.serviceId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value, ...(name === 'clientId' ? { monthlyPlanId: '' } : {}) }))
  }

  const addEntregable = () => setEntregables((prev) => [...prev, { type: 'VIDEO', formato: 'VERTICAL_9_16', title: '' }])
  const removeEntregable = (i: number) => setEntregables((prev) => prev.filter((_, idx) => idx !== i))
  const updateEntregable = (i: number, field: keyof Entregable, value: string) => {
    setEntregables((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId) { setError('Selecciona un cliente'); return }
    if (!form.nombre.trim()) { setError('El nombre del proyecto es obligatorio'); return }
    setLoading(true); setError('')
    const validEntregables = entregables.filter((e) => e.title.trim())
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId, serviceId: form.serviceId || null, monthlyPlanId: form.monthlyPlanId || null,
          nombre: form.nombre.trim(), modalidad: form.modalidad, estado: form.estado,
          linkEntrega: form.linkEntrega.trim() || '', fechaEntrega: form.fechaEntrega || null,
          observaciones: form.observaciones.trim() || null,
          entregables: validEntregables.length > 0 ? validEntregables : undefined,
        }),
      })
      if (res.ok) { router.push('/proyectos') }
      else { const data = await res.json(); setError(data.error || 'Error al crear el proyecto') }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/proyectos" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Proyecto</h1>
          <p className="text-phm-gray-soft text-sm">Registra un trabajo mensual u ocasional</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-4">Información general</h2>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cliente *</label>
                <select name="clientId" value={form.clientId} onChange={handleChange} required className={selectCls}>
                  <option value="">Selecciona un cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Modalidad *</label>
                <select name="modalidad" value={form.modalidad} onChange={handleChange} className={selectCls}>
                  <option value="OCASIONAL">Ocasional / Proyecto único</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Nombre del proyecto *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                placeholder="Ej: Vacacionales Calderón 2026" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Servicio <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
                <select name="serviceId" value={form.serviceId} onChange={handleChange} className={selectCls}>
                  <option value="">Sin servicio base</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.modalidad === 'MENSUAL' ? 'Mensual' : 'Ocasional'})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Plan mensual <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
                <select name="monthlyPlanId" value={form.monthlyPlanId} onChange={handleChange} disabled={!form.clientId}
                  className={`${selectCls} disabled:opacity-40`}>
                  <option value="">{!form.clientId ? 'Selecciona cliente primero' : 'Sin plan mensual'}</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{getMonthName(p.month)} {p.year}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Estado inicial</label>
                <select name="estado" value={form.estado} onChange={handleChange} className={selectCls}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="EN_EDICION">En Edición</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Fecha de entrega</label>
                <input name="fechaEntrega" value={form.fechaEntrega} onChange={handleChange} type="date" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Link de entrega general</label>
              <input name="linkEntrega" value={form.linkEntrega} onChange={handleChange} type="url"
                placeholder="https://drive.google.com/..." className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                className="w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors resize-none" />
            </div>
          </div>
        </PremiumCard>

        {/* Entregables */}
        <PremiumCard padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-phm-gray">Entregables</h2>
            <button type="button" onClick={addEntregable}
              className="text-xs px-3 py-1.5 text-phm-gold border border-phm-gold/30 hover:border-phm-gold/60 bg-phm-surface rounded-lg transition-all">
              + Agregar
            </button>
          </div>
          <div className="space-y-3">
            {entregables.map((ent, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <select value={ent.type} onChange={(e) => updateEntregable(i, 'type', e.target.value)}
                    className="px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors">
                    {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={ent.formato} onChange={(e) => updateEntregable(i, 'formato', e.target.value)}
                    className="px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 transition-colors">
                    {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <input value={ent.title} onChange={(e) => updateEntregable(i, 'title', e.target.value)}
                    placeholder="Título del entregable"
                    className="px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors" />
                </div>
                {entregables.length > 1 && (
                  <button type="button" onClick={() => removeEntregable(i)}
                    className="mt-1.5 text-phm-gray-soft hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-phm-gray-soft mt-3">Los entregables se crean automáticamente como contenidos al guardar.</p>
        </PremiumCard>

        {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar Proyecto'}
          </button>
          <Link href="/proyectos"
            className="px-6 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:border-phm-gold/40 rounded-lg transition-all text-center">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NuevoProyectoPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <div className="h-96 skeleton-shimmer rounded-2xl" />
        <div className="h-48 skeleton-shimmer rounded-2xl" />
      </div>
    }>
      <NuevoProyectoForm />
    </Suspense>
  )
}
