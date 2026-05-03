'use client'

import { useState, useRef } from 'react'
import { ExternalLink, Copy, Check, Save, Loader2, Link2, Folder, FileText } from 'lucide-react'
import DeliveryAccessCard from './DeliveryAccessCard'
import { getGoogleDriveEmbedInfo } from '@/lib/driveEmbed'

interface Props {
  initialLink: string | null
  onSave: (link: string) => Promise<void>
  canAdmin: boolean
  clientId: string
  entityType: 'MONTHLY_PLAN' | 'PROJECT'
  entityId: string
  existingAccess?: any
}

export default function DeliverySection({
  initialLink, onSave, canAdmin, clientId, entityType, entityId, existingAccess,
}: Props) {
  const [link, setLink]               = useState(initialLink ?? '')
  const [saved, setSaved]             = useState(initialLink ?? '')
  const [saving, setSaving]           = useState(false)
  const [saveOk, setSaveOk]           = useState(false)
  const [copied, setCopied]           = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const okTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const embedInfo  = saved ? getGoogleDriveEmbedInfo(saved) : { type: null, embedUrl: null }
  const isDirty    = link !== saved

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(link)
      setSaved(link)
      setPreviewFailed(false)
      setSaveOk(true)
      if (okTimer.current) clearTimeout(okTimer.current)
      okTimer.current = setTimeout(() => setSaveOk(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!saved) return
    navigator.clipboard.writeText(saved).then(() => {
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2500)
    })
  }

  const inputCls = 'flex-1 px-4 py-2.5 bg-phm-surface border border-phm-border-soft rounded-lg text-white text-sm focus:outline-none focus:border-phm-gold/40 transition-colors placeholder:text-phm-gray-soft/50'

  return (
    <div className="space-y-4">

      {/* Input + Guardar */}
      <div>
        <label className="block text-sm font-medium text-phm-gray-soft mb-2">
          Enlace de entrega
          <span className="text-phm-gray ml-2 font-normal text-xs">
            Google Drive, WeTransfer, galería…
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className={inputCls}
          />
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-phm-gold/10 border border-phm-gold/25 text-phm-gold hover:bg-phm-gold/20 transition-colors text-sm font-semibold disabled:opacity-40 whitespace-nowrap"
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saveOk
              ? <Check className="w-4 h-4 text-emerald-400" />
              : <Save className="w-4 h-4" />
            }
            {saveOk ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Abrir + Copiar */}
      {saved && (
        <div className="flex flex-wrap gap-2">
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-phm-surface border border-phm-border-soft text-phm-gray hover:text-white hover:border-phm-gold/40 transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir entrega
          </a>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-phm-surface border border-phm-border-soft text-phm-gray hover:text-white hover:border-phm-gold/40 transition-colors text-sm font-medium"
          >
            {copied
              ? <><Check className="w-4 h-4 text-emerald-400" /> Copiado</>
              : <><Copy className="w-4 h-4" /> Copiar enlace</>
            }
          </button>
        </div>
      )}

      {/* Vista previa Google Drive */}
      {embedInfo.embedUrl && !previewFailed && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-phm-gray-soft">Vista previa</p>
            <span className="flex items-center gap-1 text-xs text-phm-gray-soft/60">
              {embedInfo.type === 'folder'
                ? <><Folder className="w-3 h-3" /> Carpeta</>
                : <><FileText className="w-3 h-3" /> Archivo</>
              }
            </span>
          </div>
          <div className="rounded-xl overflow-hidden border border-phm-border-soft bg-phm-surface">
            <iframe
              src={embedInfo.embedUrl}
              title="Vista previa"
              className="w-full"
              style={{ height: embedInfo.type === 'folder' ? 520 : 360, border: 'none' }}
              allow="autoplay"
              onError={() => setPreviewFailed(true)}
            />
          </div>
          <p className="text-[11px] text-phm-gray-soft/50 mt-1">
            Requiere acceso público activado en Drive.
          </p>
        </div>
      )}

      {embedInfo.embedUrl && previewFailed && (
        <p className="text-xs text-phm-gray-soft italic">
          La vista previa no está disponible para este enlace.
        </p>
      )}

      {saved && !embedInfo.embedUrl && (
        <p className="text-xs text-phm-gray-soft italic">
          La vista previa no está disponible para este tipo de enlace.
        </p>
      )}

      {/* Link privado para el cliente */}
      {canAdmin && (
        <div className="pt-3 border-t border-phm-border-soft">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-phm-gold" />
            <p className="text-sm font-medium text-white">Link privado para el cliente</p>
          </div>
          <DeliveryAccessCard
            clientId={clientId}
            entityType={entityType}
            entityId={entityId}
            existing={existingAccess ?? null}
          />
        </div>
      )}
    </div>
  )
}
