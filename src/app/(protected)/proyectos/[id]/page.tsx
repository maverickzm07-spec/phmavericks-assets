'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { ClientProject } from '@/types'
import PremiumCard from '@/components/ui/PremiumCard'
import ProgressBar from '@/components/ui/ProgressBar'
import DeliverySection from '@/components/ui/DeliverySection'
import {
  getStatusLabel, getProjectStatusColor, getFormatoLabel,
  getContentTypeLabel, getContentStatusColor, getModalidadLabel,
} from '@/lib/utils'

const ESTADOS_PROYECTO  = ['PENDIENTE','EN_PROCESO','EN_EDICION','APROBADO','ENTREGADO','COMPLETADO','ATRASADO']
const ESTADOS_CONTENIDO = ['PENDING','EDITING','EN_PROCESO','APPROVED','ENTREGADO','PUBLISHED','COMPLETED']
const METODOS_PAGO = ['EFECTIVO','TRANSFERENCIA','DEPOSITO','TARJETA','OTRO']
const fmt = (v: number) => `$${v.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`
const hoy = () => new Date().toISOString().split('T')[0]

export default function ProyectoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [project, setProject]       = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [canAdmin, setCanAdmin]     = useState(false)

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
    fechaPago: hoy(),
    observacion: '',
  })

  // Editar precio final inline
  const [editandoPrecio, setEditandoPrecio]   = useState(false)
  const [precioFinalEdit, setPrecioFinalEdit] = useState('')
  const [guardandoPrecio, setGuardandoPrecio] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      .then(u => { if (['SUPER_ADMIN','ADMIN'].includes(u?.role)) setCanAdmin(true) })
      .catch(() => {})
  }, [])

  const syncEconomico = (data: any) => {
    const tp = data.totalPagado ?? (data.ingresos ?? []).reduce((s: number, i: any) => s + i.montoPagado, 0)
    const sp = data.saldoPendiente ?? null
    const ec = data.estadoEconomico ?? 'SIN_PRECIO'
    setTotalPagado(tp)
    setSaldoPendiente(sp)
    setEstadoEc(ec)
  }

  const fetchProject = () => {
    fetch(`/api/proyectos/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setProject(d)
        if (d) {
          setEditEstado(d.estado)
          setPrecioFinalEdit(String(d.precioFinal ?? ''))
          syncEconomico(d)
        }
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProject() }, [id])

  const updateEstado = async (nuevoEstado: string) => {
    setSaving(true)
    const res = await fetch(`/api/proyectos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (res.ok) fetchProject()
    setSaving(false)
  }

  const guardarPrecioFinal = async () => {
    const val = parseFloat(precioFinalEdit)
    if (isNaN(val) || val < 0) return
    setGuardandoPrecio(true)
    const res = await fetch(`/api/proyectos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precioFinal: val }),
    })
    if (res.ok) { fetchProject(); setEditandoPrecio(false) }
    setGuardandoPrecio(false)
  }

  const registrarPago = async () => {
    const monto = parseFloat(pagoForm.monto)
    if (!monto || monto <= 0) { setPagoError('Ingresa un monto válido'); return }
    setRegistrandoPago(true)
    setPagoError('')
    const res = await fetch(`/api/proyectos/${id}/pagos`, {
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
      fetchProject()
      setShowPagoForm(false)
      setPagoForm({ monto: '', metodoPago: '', fechaPago: hoy(), observacion: '' })
    } else {
      setPagoError(data.error || 'Error al registrar pago')
    }
    setRegistrandoPago(false)
  }

  const saveDeliveryLink = async (link: string) => {
    const res = await fetch(`/api/proyectos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkEntrega: link || '' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProject((prev: any) => prev ? { ...prev, linkEntrega: updated.linkEntrega } : prev)
    }
  }

  const updateContentStatus = async (contentId: string, status: string) => {
    const c = project?.contents?.find((c: any) => c.id === contentId)
    if (!c) return
    await fetch(`/api/contenidos/${contentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: project.clientId, projectId: project.id, planId: null,
        type: c.type, formato: c.formato || null, title: c.title, status,
        driveLink: c.driveLink || '', publishedLink: c.publishedLink || '',
        views: c.views, likes: c.likes, comments: c.comments, shares: c.shares, saves: c.saves,
        observations: c.observations || '',
      }),
    })
    fetchProject()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este proyecto?')) return
    await fetch(`/api/proyectos/${id}`, { method: 'DELETE' })
    router.push('/proyectos')
  }

  if (loading) return (
    <div className="max-w-3xl space-y-4">
      <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
      <div className="h-44 skeleton-shimmer rounded-2xl" />
      <div className="h-64 skeleton-shimmer rounded-2xl" />
    </div>
  )

  if (!project) return (
    <PremiumCard padding="lg" className="text-center">
      <p className="text-phm-gray mb-3">Proyecto no encontrado.</p>
      <Link href="/proyectos" className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">
        ← Volver a proyectos
      </Link>
    </PremiumCard>
  )

  const contents = project.contents || []
  const ingresos: any[] = project.ingresos ?? []
  const doneStatuses = ['PUBLISHED','COMPLETED','ENTREGADO','PUBLICADO']
  const done = contents.filter((c: any) => doneStatuses.includes(c.status)).length
  const pct  = contents.length > 0 ? Math.round((done / contents.length) * 100) : 0

  const badgeEc = ({
    SIN_PRECIO: 'bg-phm-surface text-phm-gray-soft border border-phm-border-soft',
    SIN_PAGO:   'bg-red-950/60 text-red-300 border border-red-900/40',
    ABONADO:    'bg-yellow-950/60 text-yellow-300 border border-yellow-900/40',
    PAGADO:     'bg-emerald-950/60 text-emerald-300 border border-emerald-900/40',
  } as Record<string,string>)[estadoEc] ?? 'bg-phm-surface text-phm-gray-soft'

  const labelEc = ({ SIN_PRECIO: 'Sin precio', SIN_PAGO: 'Sin pago', ABONADO: 'Abonado', PAGADO: 'Pagado completo' } as Record<string,string>)[estadoEc] ?? estadoEc

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/proyectos" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{project.nombre}</h1>
          <p className="text-phm-gray-soft text-sm">{project.client?.name} — {project.client?.business}</p>
        </div>
        <button onClick={handleDelete}
          className="px-3 py-2 text-sm font-medium text-red-400 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 rounded-lg transition-all">
          Eliminar
        </button>
      </div>

      {/* Info + Estado */}
      <PremiumCard padding="md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getProjectStatusColor(project.estado)}`}>
                {getStatusLabel(project.estado, 'project')}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-phm-surface border border-phm-border-soft text-phm-gray">
                {getModalidadLabel(project.modalidad)}
              </span>
              {project.service && (
                <span className="text-xs text-phm-gray-soft">{project.service.nombre}</span>
              )}
            </div>
            {project.fechaEntrega && (
              <p className="text-xs text-phm-gray-soft">
                Fecha de entrega:{' '}
                <span className="text-phm-gray">{new Date(project.fechaEntrega).toLocaleDateString('es-CO')}</span>
              </p>
            )}
            {project.observaciones && (
              <p className="text-xs text-phm-gray-soft">{project.observaciones}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <label className="block text-xs text-phm-gray-soft mb-1.5">Cambiar estado</label>
            <select value={editEstado} onChange={e => { setEditEstado(e.target.value); updateEstado(e.target.value) }}
              disabled={saving}
              className="px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-phm-gray text-sm focus:outline-none focus:border-phm-gold/40 disabled:opacity-50 transition-colors">
              {ESTADOS_PROYECTO.map(e => <option key={e} value={e}>{getStatusLabel(e, 'project')}</option>)}
            </select>
          </div>
        </div>
        {contents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-phm-border-soft">
            <div className="flex justify-between text-xs text-phm-gray-soft mb-2">
              <span>{done} de {contents.length} entregables completados</span>
              <span className={`font-semibold ${pct === 100 ? 'text-emerald-400' : 'text-phm-gold'}`}>{pct}%</span>
            </div>
            <ProgressBar value={pct} size="md" />
          </div>
        )}
      </PremiumCard>

      {/* Estado Económico */}
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

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-phm-surface border border-phm-border-soft rounded-lg p-3 text-center">
            <p className="text-xs text-phm-gray-soft mb-1">Precio base</p>
            <p className="text-base font-bold text-phm-gray">{project.precioBase != null ? fmt(project.precioBase) : '—'}</p>
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
                <button onClick={guardarPrecioFinal} disabled={guardandoPrecio}
                  className="text-xs text-emerald-400 hover:text-emerald-300">✓</button>
                <button onClick={() => setEditandoPrecio(false)} className="text-xs text-phm-gray-soft hover:text-white">✕</button>
              </div>
            ) : (
              <p className="text-base font-bold text-phm-gold cursor-pointer hover:text-phm-gold-bright"
                onClick={() => canAdmin && setEditandoPrecio(true)}>
                {project.precioFinal != null ? fmt(project.precioFinal) : <span className="text-phm-gray-soft text-sm">Definir</span>}
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

      {/* Entrega del cliente */}
      <PremiumCard padding="md">
        <h2 className="font-semibold text-white mb-5">Entrega del cliente</h2>
        <DeliverySection
          initialLink={project.linkEntrega ?? null}
          onSave={saveDeliveryLink}
          canAdmin={canAdmin}
          clientId={project.clientId}
          entityType="PROJECT"
          entityId={project.id}
          existingAccess={project.deliveryAccesses?.[0] ?? null}
        />
      </PremiumCard>

      {/* Entregables */}
      <PremiumCard padding="none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-phm-border-soft">
          <div>
            <h2 className="font-semibold text-white text-sm">Entregables ({contents.length})</h2>
            <p className="text-xs text-phm-gray-soft mt-0.5">Seguimiento interno de producción</p>
          </div>
          <Link href={`/contenidos/nuevo?projectId=${project.id}&clientId=${project.clientId}`}
            className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">
            + Agregar
          </Link>
        </div>
        {contents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-phm-gray-soft text-sm mb-3">No hay entregables todavía.</p>
            <Link href={`/contenidos/nuevo?projectId=${project.id}&clientId=${project.clientId}`}
              className="text-sm text-phm-gold hover:text-phm-gold-bright transition-colors">
              + Agregar uno
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-phm-border-soft">
            {contents.map((c: any) => (
              <div key={c.id} className="p-4 flex items-center gap-3 row-hover">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-phm-gray-soft">{getContentTypeLabel(c.type)}</span>
                    {c.formato && <span className="text-xs text-phm-gray-soft">· {getFormatoLabel(c.formato)}</span>}
                    {c.driveLink && (
                      <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-phm-gray-soft hover:text-phm-gold transition-colors">
                        ↗ Drive interno
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={c.status} onChange={e => updateContentStatus(c.id, e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border-0 focus:outline-none cursor-pointer ${getContentStatusColor(c.status)}`}>
                    {ESTADOS_CONTENIDO.map(s => <option key={s} value={s}>{getStatusLabel(s, 'content')}</option>)}
                  </select>
                  <Link href={`/contenidos/${c.id}`}
                    className="text-xs text-phm-gray hover:text-phm-gold transition-colors px-2 py-1 bg-phm-surface border border-phm-border-soft rounded-lg">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </PremiumCard>

      {error && (
        <div className="px-4 py-3 bg-red-950/60 border border-red-900/60 rounded-lg text-sm text-red-300">{error}</div>
      )}
    </div>
  )
}
