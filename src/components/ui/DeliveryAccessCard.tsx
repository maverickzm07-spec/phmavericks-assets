'use client'

import { useState } from 'react'
import { Link2, Copy, Check, RefreshCw, EyeOff, Eye, Loader2, ExternalLink } from 'lucide-react'

interface DeliveryAccess {
  id: string
  token: string
  publicSlug?: string | null
  isActive: boolean
  type: string
}

interface Props {
  clientId: string
  entityType: 'MONTHLY_PLAN' | 'PROJECT' | 'CLIENT_GENERAL'
  entityId?: string
  existing?: DeliveryAccess | null
  onGenerated?: (access: DeliveryAccess) => void
}

export default function DeliveryAccessCard({ clientId, entityType, entityId, existing, onGenerated }: Props) {
  const [access, setAccess] = useState<DeliveryAccess | null>(existing ?? null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.phmavericks.com'
  const deliveryUrl = access
    ? access.publicSlug
      ? `${origin}/e/${access.publicSlug}`
      : `${origin}/entrega/${access.token}`
    : ''

  async function generate() {
    setLoading(true)
    try {
      const body: Record<string, string> = { clientId, type: entityType }
      if (entityType === 'MONTHLY_PLAN' && entityId) body.monthlyPlanId = entityId
      if (entityType === 'PROJECT' && entityId) body.projectId = entityId

      const r = await fetch('/api/delivery-access/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        const a = await r.json()
        setAccess(a)
        onGenerated?.(a)
      }
    } finally {
      setLoading(false)
    }
  }

  async function regenerate() {
    if (!access) return
    setLoading(true)
    try {
      const r = await fetch(`/api/delivery-access/${access.id}/regenerate`, { method: 'POST' })
      if (r.ok) setAccess(await r.json())
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive() {
    if (!access) return
    setLoading(true)
    try {
      const endpoint = access.isActive ? 'disable' : 'enable'
      const r = await fetch(`/api/delivery-access/${access.id}/${endpoint}`, { method: 'POST' })
      if (r.ok) setAccess(await r.json())
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(deliveryUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-yellow-500" />
        <p className="text-sm font-semibold text-white">Link privado de entrega</p>
      </div>

      {!access ? (
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Generar link
        </button>
      ) : (
        <div className="space-y-3">
          {/* URL visible */}
          <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${access.isActive ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900 border-zinc-700/50 opacity-60'}`}>
            <p className="flex-1 text-xs text-zinc-300 truncate font-mono">{deliveryUrl}</p>
            <div className="flex items-center gap-1 shrink-0">
              <a href={deliveryUrl} target="_blank" rel="noopener noreferrer"
                className={`text-zinc-500 hover:text-white transition-colors ${!access.isActive ? 'pointer-events-none opacity-40' : ''}`}>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={copyLink} disabled={!access.isActive}
                className="text-zinc-500 hover:text-white transition-colors disabled:opacity-40">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Badge slug vs token */}
          {access.publicSlug ? (
            <p className="text-[10px] text-zinc-600">
              Link corto activo · <span className="text-zinc-500 font-mono">/e/{access.publicSlug}</span>
            </p>
          ) : (
            <p className="text-[10px] text-amber-600">
              Link largo · regenera para obtener URL corta
            </p>
          )}

          {!access.isActive && (
            <p className="text-xs text-red-400">Link desactivado — el cliente no puede acceder.</p>
          )}

          <div className="flex items-center gap-2">
            <button onClick={copyLink} disabled={!access.isActive || loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-40">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button onClick={regenerate} disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors disabled:opacity-40">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerar
            </button>
            <button onClick={toggleActive} disabled={loading}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                access.isActive
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                  : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
              }`}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : access.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {access.isActive ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
