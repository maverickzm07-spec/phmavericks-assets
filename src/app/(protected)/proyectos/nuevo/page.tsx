'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getMonthName } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'FOTO', label: 'Foto' },
  { value: 'FLYER', label: 'Flyer' },
  { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'REEL', label: 'Reel' },
  { value: 'VIDEO_HORIZONTAL', label: 'Video Horizontal' },
  { value: 'IMAGEN_FLYER', label: 'Imagen/Flyer' },
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
      fetch(`/api/planes?clientId=${form.clientId}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setPlans(Array.isArray(d) ? d : []))
        .catch(() => setPlans([]))
    } else {
      setPlans([])
    }
  }, [form.clientId])

  // Cuando se selecciona un servicio, pre-llenar entregables basados en sus cantidades
  useEffect(() => {
    if (!form.serviceId) return
    const svc = services.find((s) => s.id === form.serviceId)
    if (!svc) return
    const auto: Entregable[] = []
    for (let i = 0; i < svc.cantidadReels; i++) auto.push({ type: 'REEL', formato: 'VERTICAL_9_16', title: `Reel ${i + 1}` })
    for (let i = 0; i < svc.cantidadVideosHorizontales; i++) auto.push({ type: 'VIDEO', formato: 'HORIZONTAL_16_9', title: `Video Horizontal ${i + 1}` })
    for (let i = 0; i < svc.cantidadFotos; i++) auto.push({ type: 'FOTO', formato: 'NO_APLICA', title: `Foto ${i + 1}` })
    for (let i = 0; i < svc.cantidadImagenesFlyers; i++) auto.push({ type: 'FLYER', formato: 'CUADRADO_1_1', title: `Flyer ${i + 1}` })
    if (auto.length > 0) setEntregables(auto)
    if (svc.modalidad) setForm((f) => ({ ...f, modalidad: svc.modalidad }))
  }, [form.serviceId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'clientId' ? { monthlyPlanId: '' } : {}),
    }))
  }

  const addEntregable = () => setEntregables((prev) => [...prev, { type: 'VIDEO', formato: 'VERTICAL_9_16', title: '' }])
  const removeEntregable = (i: number) => setEntregables((prev) => prev.filter((_, idx) => idx !== i))
  const updateEntregable = (i: number, field: keyof Entregable, value: string) => {
    setEntregables((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const validEntregables = entregables.filter((e) => e.title.trim())
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          serviceId: form.serviceId || null,
          monthlyPlanId: form.monthlyPlanId || null,
          linkEntrega: form.linkEntrega || null,
          fechaEntrega: form.fechaEntrega || null,
          entregables: validEntregables.length > 0 ? validEntregables : undefined,
        }),
      })
      if (res.ok) {
        router.push('/proyectos')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear el proyecto')
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
        <Link href="/proyectos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nuevo Proyecto</h1>
          <p className="text-zinc-500 text-sm">Registra un trabajo mensual u ocasional</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-300">Información general</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente *</label>
              <select name="clientId" value={form.clientId} onChange={handleChange} required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="">Selecciona un cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Modalidad *</label>
              <select name="modalidad" value={form.modalidad} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="OCASIONAL">Ocasional / Proyecto único</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nombre del proyecto *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              placeholder="Ej: Vacacionales Calderón 2026"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Servicio <span className="text-zinc-500 font-normal">(opcional)</span>
              </label>
              <select name="serviceId" value={form.serviceId} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="">Sin servicio base</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.modalidad === 'MENSUAL' ? 'Mensual' : 'Ocasional'})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Plan mensual <span className="text-zinc-500 font-normal">(opcional)</span>
              </label>
              <select name="monthlyPlanId" value={form.monthlyPlanId} onChange={handleChange}
                disabled={!form.clientId}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-40">
                <option value="">{!form.clientId ? 'Selecciona cliente primero' : 'Sin plan mensual'}</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{getMonthName(p.month)} {p.year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado inicial</label>
              <select name="estado" value={form.estado} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="EN_EDICION">En Edición</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Fecha de entrega</label>
              <input name="fechaEntrega" value={form.fechaEntrega} onChange={handleChange} type="date"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link de entrega general</label>
            <input name="linkEntrega" value={form.linkEntrega} onChange={handleChange} type="url"
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
          </div>
        </div>

        {/* Entregables */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Entregables</h2>
            <button type="button" onClick={addEntregable}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
              + Agregar
            </button>
          </div>
          <div className="space-y-3">
            {entregables.map((ent, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <select value={ent.type} onChange={(e) => updateEntregable(i, 'type', e.target.value)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none">
                    {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={ent.formato} onChange={(e) => updateEntregable(i, 'formato', e.target.value)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none">
                    {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <input value={ent.title} onChange={(e) => updateEntregable(i, 'title', e.target.value)}
                    placeholder="Título del entregable"
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none" />
                </div>
                {entregables.length > 1 && (
                  <button type="button" onClick={() => removeEntregable(i)}
                    className="mt-1 text-red-500 hover:text-red-400 text-lg leading-none">×</button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-3">Los entregables se crean automáticamente como contenidos al guardar.</p>
        </div>

        {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#8B0000' }}>
            {loading ? 'Guardando...' : 'Guardar Proyecto'}
          </button>
          <Link href="/proyectos"
            className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NuevoProyectoPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>}>
      <NuevoProyectoForm />
    </Suspense>
  )
}
