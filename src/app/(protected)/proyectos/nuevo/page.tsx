'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Plus, X } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import { ESTADOS_VIGENTES, ESTADO_LABELS } from '@/lib/projectStatus'

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

const METODOS_PAGO = [
  { value: '', label: 'Sin especificar' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    serviceId: searchParams.get('serviceId') || '',
    nombre: '',
    descripcion: '',
    modalidad: 'OCASIONAL',
    estado: 'CONFIRMADO',
    precioFinal: '',
    abono: '',
    metodoPago: '',
    fechaPago: '',
    fechaGrabacion: '',
    fechaEntrega: '',
    driveLink: '',
    linkEntrega: '',
    mensajeEntrega: '',
    observaciones: '',
  })

  // La cotización se sube después de crear el proyecto, porque el documento
  // necesita el id del proyecto al que pertenece.
  const [cotizacion, setCotizacion] = useState<File | null>(null)

  // Los entregables son opcionales: un proyecto se registra con su cotización y
  // su valor, sin desglosar cada foto o reel. Esta sección queda cerrada salvo
  // que se quiera llevar el detalle pieza por pieza.
  const [verEntregables, setVerEntregables] = useState(false)
  const [entregables, setEntregables] = useState<Entregable[]>([])

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClients).catch(() => {})
    fetch('/api/servicios').then((r) => r.json()).then(setServices).catch(() => {})
  }, [])

  // Al elegir un servicio del catálogo se precarga su precio como referencia;
  // el valor final siempre se puede ajustar a lo acordado con el cliente.
  useEffect(() => {
    if (!form.serviceId) return
    const svc = services.find((s) => s.id === form.serviceId)
    if (!svc) return
    setForm((f) => ({
      ...f,
      precioFinal: f.precioFinal || (svc.precio ? String(svc.precio) : ''),
      modalidad: svc.modalidad || f.modalidad,
    }))
  }, [form.serviceId, services])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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

    const precio = form.precioFinal ? Number(form.precioFinal) : null
    const abono = form.abono ? Number(form.abono) : null
    if (precio !== null && (isNaN(precio) || precio < 0)) { setError('El valor final no es válido'); return }
    if (abono !== null && (isNaN(abono) || abono < 0)) { setError('El anticipo no es válido'); return }
    if (abono !== null && precio !== null && abono > precio) {
      setError('El anticipo no puede superar el valor final del proyecto')
      return
    }
    if (abono !== null && abono > 0 && precio === null) {
      setError('Para registrar un anticipo indica primero el valor final')
      return
    }

    setLoading(true); setError(''); setAviso('')
    const validEntregables = entregables.filter((x) => x.title.trim())

    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          serviceId: form.serviceId || null,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          modalidad: form.modalidad,
          estado: form.estado,
          precioFinal: precio,
          abono: abono && abono > 0 ? abono : null,
          metodoPago: form.metodoPago || null,
          fechaPago: form.fechaPago || null,
          fechaGrabacion: form.fechaGrabacion || null,
          fechaEntrega: form.fechaEntrega || null,
          driveLink: form.driveLink.trim() || '',
          linkEntrega: form.linkEntrega.trim() || '',
          mensajeEntrega: form.mensajeEntrega.trim() || null,
          observaciones: form.observaciones.trim() || null,
          entregables: validEntregables.length > 0 ? validEntregables : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al crear el proyecto')
        setLoading(false)
        return
      }

      const creado = await res.json()

      // El proyecto ya quedó guardado: si la cotización falla, se avisa pero no
      // se pierde el registro.
      if (cotizacion && creado?.id) {
        const fd = new FormData()
        fd.append('archivo', cotizacion)
        fd.append('tipo', 'COTIZACION')
        fd.append('projectId', creado.id)
        const up = await fetch('/api/documentos', { method: 'POST', body: fd })
        if (!up.ok) {
          const data = await up.json().catch(() => ({}))
          setAviso(`El proyecto se guardó, pero la cotización no se pudo adjuntar: ${data.error || 'error al subir'}. Puedes adjuntarla desde la ficha del proyecto.`)
          setLoading(false)
          return
        }
      }

      router.push(`/proyectos/${creado.id}`)
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-red-bright/40 transition-colors'
  const selectCls = 'w-full px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-red-bright/40 transition-colors'
  const labelCls = 'block text-sm font-medium text-phm-gray-soft mb-1.5'

  const saldo = form.precioFinal
    ? Math.max(0, Number(form.precioFinal) - (form.abono ? Number(form.abono) : 0))
    : 0

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/proyectos" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Proyecto</h1>
          <p className="text-phm-gray-soft text-sm">Registra el trabajo acordado con el cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-4">Información general</h2>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="clientId">Cliente *</label>
                <select id="clientId" name="clientId" value={form.clientId} onChange={handleChange} required className={selectCls}>
                  <option value="">Selecciona un cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.business ? ` — ${c.business}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="serviceId">Servicio <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
                <select id="serviceId" name="serviceId" value={form.serviceId} onChange={handleChange} className={selectCls}>
                  <option value="">Sin servicio base</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="nombre">Nombre del proyecto *</label>
              <input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required
                placeholder="Ej: Boda Michele Events" className={inputCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="descripcion">Descripción del servicio contratado</label>
              <textarea id="descripcion" name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                placeholder="Ej: 5 reels y 15 fotografías editadas, una jornada de grabación" className={inputCls} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="estado">Estado de producción</label>
                <select id="estado" name="estado" value={form.estado} onChange={handleChange} className={selectCls}>
                  {ESTADOS_VIGENTES.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="modalidad">Modalidad</label>
                <select id="modalidad" name="modalidad" value={form.modalidad} onChange={handleChange} className={selectCls}>
                  <option value="OCASIONAL">Ocasional / Proyecto único</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-1">Cotización aprobada</h2>
          <p className="text-xs text-phm-gray-soft mb-4">Adjunta el PDF que el cliente aprobó. Queda guardado en la ficha del proyecto.</p>

          <label htmlFor="cotizacion"
            className="flex items-center gap-3 px-4 py-3 bg-phm-surface border border-dashed border-phm-border-soft hover:border-phm-red-bright/40 rounded-lg cursor-pointer transition-colors">
            <FileText className="w-4 h-4 text-phm-red-bright flex-shrink-0" />
            <span className="text-sm text-phm-gray truncate">
              {cotizacion ? cotizacion.name : 'Seleccionar archivo PDF (máximo 10 MB)'}
            </span>
          </label>
          <input id="cotizacion" type="file" accept="application/pdf" className="sr-only"
            onChange={(e) => setCotizacion(e.target.files?.[0] ?? null)} />
          {cotizacion && (
            <button type="button" onClick={() => setCotizacion(null)}
              className="mt-2 text-xs text-phm-gray-soft hover:text-red-400 transition-colors">
              Quitar archivo
            </button>
          )}
        </PremiumCard>

        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-4">Condiciones económicas</h2>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="precioFinal">Valor final acordado (USD)</label>
                <input id="precioFinal" name="precioFinal" value={form.precioFinal} onChange={handleChange}
                  type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="abono">Anticipo recibido <span className="text-phm-gray-soft font-normal">(si lo hay)</span></label>
                <input id="abono" name="abono" value={form.abono} onChange={handleChange}
                  type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} />
              </div>
            </div>

            {form.abono && Number(form.abono) > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="metodoPago">Método de pago</label>
                  <select id="metodoPago" name="metodoPago" value={form.metodoPago} onChange={handleChange} className={selectCls}>
                    {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="fechaPago">Fecha del pago</label>
                  <input id="fechaPago" name="fechaPago" value={form.fechaPago} onChange={handleChange} type="date" className={inputCls} />
                </div>
              </div>
            ) : null}

            {form.precioFinal ? (
              <div className="flex items-center justify-between px-4 py-3 bg-phm-surface border border-phm-border-soft rounded-lg">
                <span className="text-sm text-phm-gray-soft">Saldo pendiente tras el anticipo</span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  ${saldo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ) : null}
          </div>
        </PremiumCard>

        <PremiumCard padding="md">
          <h2 className="text-sm font-semibold text-phm-gray mb-1">Fechas y entrega</h2>
          <p className="text-xs text-phm-gray-soft mb-4">Las fechas de grabación y entrega se agregan al calendario.</p>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="fechaGrabacion">Fecha de grabación o sesión</label>
                <input id="fechaGrabacion" name="fechaGrabacion" value={form.fechaGrabacion} onChange={handleChange} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="fechaEntrega">Fecha de entrega</label>
                <input id="fechaEntrega" name="fechaEntrega" value={form.fechaEntrega} onChange={handleChange} type="date" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="driveLink">Carpeta de Google Drive</label>
              <input id="driveLink" name="driveLink" value={form.driveLink} onChange={handleChange} type="url"
                placeholder="https://drive.google.com/drive/folders/..." className={inputCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="linkEntrega">Enlace de entrega al cliente <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
              <input id="linkEntrega" name="linkEntrega" value={form.linkEntrega} onChange={handleChange} type="url"
                placeholder="https://drive.google.com/..." className={inputCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="mensajeEntrega">Mensaje de agradecimiento <span className="text-phm-gray-soft font-normal">(opcional)</span></label>
              <textarea id="mensajeEntrega" name="mensajeEntrega" value={form.mensajeEntrega} onChange={handleChange} rows={2}
                placeholder="Lo verá el cliente en su portal de entrega. Si lo dejas vacío se usa uno por defecto." className={inputCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="observaciones">Observaciones y condiciones especiales</label>
              <textarea id="observaciones" name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                placeholder="Notas internas. No se muestran al cliente." className={inputCls} />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard padding="md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-phm-gray">Entregables pieza por pieza</h2>
              <p className="text-xs text-phm-gray-soft mt-0.5">
                No hace falta registrarlos. Úsalo solo si quieres seguir el avance de cada pieza por separado.
              </p>
            </div>
            <button type="button" onClick={() => setVerEntregables((v) => !v)}
              className="flex-shrink-0 text-xs px-3 py-1.5 text-phm-gray border border-phm-border-soft hover:border-phm-red-bright/40 hover:text-white rounded-lg transition-colors">
              {verEntregables ? 'Ocultar' : 'Agregar detalle'}
            </button>
          </div>

          {verEntregables && (
            <div className="mt-4 space-y-3">
              {entregables.map((ent, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid gap-2 sm:grid-cols-3">
                    <select value={ent.type} onChange={(e) => updateEntregable(i, 'type', e.target.value)} className={selectCls} aria-label="Tipo">
                      {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <select value={ent.formato} onChange={(e) => updateEntregable(i, 'formato', e.target.value)} className={selectCls} aria-label="Formato">
                      {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <input value={ent.title} onChange={(e) => updateEntregable(i, 'title', e.target.value)}
                      placeholder="Título" className={inputCls} aria-label="Título del entregable" />
                  </div>
                  <button type="button" onClick={() => removeEntregable(i)}
                    className="mt-2.5 text-phm-gray-soft hover:text-red-400 transition-colors" aria-label="Quitar entregable">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addEntregable}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 text-phm-red-bright border border-phm-red-bright/30 hover:border-phm-red-bright/60 bg-phm-surface rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar entregable
              </button>
            </div>
          )}
        </PremiumCard>

        {error && <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>}
        {aviso && <div className="px-4 py-3 bg-amber-950/50 border border-amber-900/60 rounded-lg text-sm text-amber-200">{aviso}</div>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 min-w-[180px] py-2.5 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar proyecto'}
          </button>
          <Link href="/proyectos"
            className="px-6 py-2.5 text-sm font-medium text-phm-gray bg-phm-surface border border-phm-border-soft hover:border-phm-red-bright/40 rounded-lg transition-colors">
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
