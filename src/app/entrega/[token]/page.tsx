'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import {
  CheckCircle2, Clock, AlertTriangle, ExternalLink,
  Copy, Check, AlertCircle,
} from 'lucide-react'

// ─── Configuración central ────────────────────────────────────────────────────

const PHM_WHATSAPP = process.env.NEXT_PUBLIC_PHM_WHATSAPP_NUMBER ?? '593XXXXXXXXX'
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGoogleDrivePreviewUrl(url: string): string | null {
  if (!url) return null
  try {
    const driveFile = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`

    const docs = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/)
    if (docs) return `https://docs.google.com/${docs[1]}/d/${docs[2]}/preview`

    return null
  } catch {
    return null
  }
}

function buildWhatsappUrl(clientName: string, subject: string): string {
  const msg = encodeURIComponent(
    `Hola, soy ${clientName}. Tengo una consulta sobre mi entrega: ${subject}.`
  )
  return `https://wa.me/${PHM_WHATSAPP}?text=${msg}`
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Status configs ───────────────────────────────────────────────────────────

interface StatusCfg {
  label: string
  color: string
  bg: string
  border: string
  icon: 'check' | 'clock' | 'alert' | 'progress'
}

const PLAN_STATUS: Record<string, StatusCfg> = {
  IN_PROGRESS: { label: 'En producción', color: 'text-blue-300',    bg: 'bg-blue-950/50',    border: 'border-blue-800/50',    icon: 'progress' },
  COMPLETED:   { label: 'Completado',    color: 'text-emerald-300', bg: 'bg-emerald-950/50', border: 'border-emerald-800/50', icon: 'check'    },
  DELAYED:     { label: 'Atrasado',      color: 'text-red-300',     bg: 'bg-red-950/50',     border: 'border-red-800/50',     icon: 'alert'    },
}

const PROJECT_STATUS: Record<string, StatusCfg> = {
  PENDIENTE:  { label: 'Pendiente',     color: 'text-yellow-300',  bg: 'bg-yellow-950/50',  border: 'border-yellow-800/50',  icon: 'clock'    },
  EN_PROCESO: { label: 'En producción', color: 'text-blue-300',    bg: 'bg-blue-950/50',    border: 'border-blue-800/50',    icon: 'progress' },
  EN_EDICION: { label: 'En edición',    color: 'text-purple-300',  bg: 'bg-purple-950/50',  border: 'border-purple-800/50',  icon: 'progress' },
  APROBADO:   { label: 'En revisión',   color: 'text-cyan-300',    bg: 'bg-cyan-950/50',    border: 'border-cyan-800/50',    icon: 'progress' },
  ENTREGADO:  { label: 'Entregado',     color: 'text-emerald-300', bg: 'bg-emerald-950/50', border: 'border-emerald-800/50', icon: 'check'    },
  COMPLETADO: { label: 'Completado',    color: 'text-emerald-300', bg: 'bg-emerald-950/50', border: 'border-emerald-800/50', icon: 'check'    },
  ATRASADO:   { label: 'Atrasado',      color: 'text-red-300',     bg: 'bg-red-950/50',     border: 'border-red-800/50',     icon: 'alert'    },
}

const PAYMENT_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Pendiente de pago', color: 'text-red-300',     bg: 'bg-red-950/40',     border: 'border-red-800/40'     },
  PARTIAL: { label: 'Pago parcial',      color: 'text-yellow-300',  bg: 'bg-yellow-950/40',  border: 'border-yellow-800/40'  },
  PAID:    { label: 'Pago completado',   color: 'text-emerald-300', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function StatusIcon({ type }: { type: StatusCfg['icon'] }) {
  if (type === 'check')   return <CheckCircle2 className="w-7 h-7" />
  if (type === 'alert')   return <AlertTriangle className="w-7 h-7" />
  return <Clock className="w-7 h-7" />
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EntregaTokenPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]               = useState<any>(null)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [copied, setCopied]           = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/public/delivery/${token}`)
      .then(async (r) => {
        if (!r.ok) { const e = await r.json(); setError(e.error ?? 'Error'); return }
        setData(await r.json())
      })
      .catch(() => setError('No se pudo cargar la información.'))
      .finally(() => setLoading(false))
  }, [token])

  // ─ Loading
  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
    </div>
  )

  // ─ Error
  if (error || !data) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-4">
      <AlertCircle className="w-10 h-10 text-zinc-600" />
      <p className="text-white font-semibold text-lg">Link no disponible</p>
      <p className="text-zinc-500 text-sm">{error || 'Este link no existe o ha sido desactivado.'}</p>
    </div>
  )

  const { client, monthlyPlan, project } = data

  const deliveryLink  = monthlyPlan?.deliveryLink || project?.linkEntrega || null
  const previewUrl    = deliveryLink ? getGoogleDrivePreviewUrl(deliveryLink) : null
  const statusCfg     = monthlyPlan
    ? (PLAN_STATUS[monthlyPlan.planStatus] ?? PLAN_STATUS['IN_PROGRESS'])
    : (PROJECT_STATUS[project?.estado]    ?? PROJECT_STATUS['PENDIENTE'])
  const paymentCfg    = monthlyPlan ? PAYMENT_CFG[monthlyPlan.paymentStatus] : null
  const isPaid        = monthlyPlan?.paymentStatus === 'PAID'
  const isPending     = monthlyPlan?.paymentStatus === 'PENDING'

  const subjectName   = monthlyPlan
    ? `Plan ${MONTHS[(monthlyPlan.month ?? 1) - 1]} ${monthlyPlan.year}`
    : (project?.nombre ?? 'entrega')
  const waUrl = buildWhatsappUrl(client.name, subjectName)

  function copyLink() {
    if (!deliveryLink) return
    navigator.clipboard.writeText(deliveryLink).then(() => {
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-phmavericks.png"
              alt="PHMavericks"
              width={32}
              height={32}
              className="rounded-lg object-contain"
              priority
            />
            <div>
              <p className="text-xs font-bold text-white leading-tight">PHMavericks</p>
              <p className="text-[10px] text-zinc-500 leading-tight">Estado de entrega</p>
            </div>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-medium"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-20">

        {/* ── A. INFO DEL CLIENTE ──────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Cliente</p>
          <h1 className="text-2xl font-bold text-white leading-snug">{client.name}</h1>
          {client.business && (
            <p className="text-zinc-400 text-sm mt-0.5">{client.business}</p>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-start gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">
                {monthlyPlan ? 'Plan mensual' : 'Proyecto'}
              </p>
              <p className="font-semibold text-white text-sm">
                {monthlyPlan
                  ? `${MONTHS[(monthlyPlan.month ?? 1) - 1]} ${monthlyPlan.year}`
                  : project?.nombre ?? '—'}
              </p>
            </div>

            {project?.fechaEntrega && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Fecha de entrega</p>
                <p className="font-semibold text-white text-sm">
                  {new Date(project.fechaEntrega).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── C. ESTADO ────────────────────────────────────────────────────── */}
        <div className={`${statusCfg.bg} border ${statusCfg.border} rounded-2xl p-5`}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Estado actual</p>
          <div className={`flex items-center gap-3 ${statusCfg.color}`}>
            <StatusIcon type={statusCfg.icon} />
            <span className="text-2xl font-bold tracking-tight">{statusCfg.label}</span>
          </div>
          {project?.observaciones && (
            <p className="mt-3 text-sm text-zinc-400 border-t border-zinc-700/50 pt-3">
              {project.observaciones}
            </p>
          )}
        </div>

        {/* ── D + E. ENTREGA ────────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Archivos de entrega</p>

          {deliveryLink ? (
            <div className="space-y-3">
              {/* URL de entrega */}
              <div className="flex items-center gap-2 bg-zinc-800/70 rounded-xl px-3 py-2.5 border border-zinc-700/50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="w-4 h-4 shrink-0 text-[#C9A84C]">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <p className="text-xs text-zinc-300 font-mono truncate flex-1 select-all">
                  {deliveryLink}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={deliveryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors text-sm font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir entrega
                </a>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-600 transition-colors text-sm font-semibold"
                >
                  {copied
                    ? <><Check className="w-4 h-4 text-emerald-400" /> Copiado</>
                    : <><Copy className="w-4 h-4" /> Copiar enlace</>
                  }
                </button>
              </div>

              {/* Vista previa Google Drive */}
              {previewUrl && !previewFailed && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 mt-1">
                    Vista previa
                  </p>
                  <div className="rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-800">
                    <iframe
                      src={previewUrl}
                      title="Vista previa de entrega"
                      className="w-full"
                      style={{ height: 420, border: 'none' }}
                      allow="autoplay"
                      onError={() => setPreviewFailed(true)}
                    />
                  </div>
                </div>
              )}

              {((previewUrl && previewFailed) || !previewUrl) && (
                <p className="text-xs text-zinc-600 text-center pt-1">
                  {previewFailed
                    ? 'La vista previa no está disponible para este enlace.'
                    : 'La vista previa no está disponible para este tipo de enlace.'}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-200 font-medium">Tu entrega todavía no está disponible.</p>
              <p className="text-zinc-500 text-sm">Cuando esté lista, aparecerá aquí.</p>
            </div>
          )}
        </div>

        {/* ── F. PAGO (solo planes mensuales) ──────────────────────────────── */}
        {monthlyPlan && paymentCfg && (
          <div className={`${paymentCfg.bg} border ${paymentCfg.border} rounded-2xl p-5`}>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Resumen de pago</p>

            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 bg-zinc-900/60 ${paymentCfg.color}`}>
              {isPaid    && <CheckCircle2  className="w-4 h-4" />}
              {isPending && <Clock        className="w-4 h-4" />}
              {!isPaid && !isPending && <AlertTriangle className="w-4 h-4" />}
              {paymentCfg.label}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Total',    value: formatCOP(monthlyPlan.monthlyPrice),                               cls: 'text-white'       },
                { label: 'Abonado',  value: isPaid ? formatCOP(monthlyPlan.monthlyPrice) : isPending ? formatCOP(0) : '—', cls: isPaid ? 'text-emerald-400' : 'text-zinc-300' },
                { label: 'Pendiente',value: isPaid ? formatCOP(0) : isPending ? formatCOP(monthlyPlan.monthlyPrice) : '—', cls: isPending ? 'text-red-400' : isPaid ? 'text-emerald-400' : 'text-yellow-400' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-zinc-900/70 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-sm font-bold ${cls}`}>{value}</p>
                </div>
              ))}
            </div>

            {!isPaid && !isPending && (
              <p className="text-xs text-zinc-500 text-center mt-3">
                Consulta el detalle de tu pago directamente con PHMavericks.
              </p>
            )}
          </div>
        )}

        {/* ── FOOTER WHATSAPP ──────────────────────────────────────────────── */}
        <div className="pt-4 text-center space-y-3">
          <p className="text-zinc-500 text-sm">¿Tienes dudas sobre tu entrega?</p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366]/20 transition-colors font-semibold"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Contactar por WhatsApp
          </a>
          <p className="text-zinc-700 text-xs pt-2">
            © {new Date().getFullYear()} PHMavericks · Entrega privada generada para {client.name}
          </p>
        </div>
      </main>
    </div>
  )
}
