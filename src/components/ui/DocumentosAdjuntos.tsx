'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'

export interface Documento {
  id: string
  tipo: string
  nombreOriginal: string
  mimeType: string
  tamanoBytes: number
  numeroFactura?: string | null
  createdAt: string
}

const TIPO_LABELS: Record<string, string> = {
  COTIZACION: 'Cotización',
  FACTURA_PDF: 'Factura PDF',
  FACTURA_XML: 'Factura XML',
  COMPROBANTE: 'Comprobante',
  OTRO: 'Documento',
}

function formatoTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  projectId?: string
  ingresoId?: string
  /** Tipo que se asigna al subir desde este panel. */
  tipo?: string
  titulo?: string
  descripcion?: string
  /** Formatos aceptados por el selector de archivos. */
  accept?: string
  puedeEditar?: boolean
}

export default function DocumentosAdjuntos({
  projectId,
  ingresoId,
  tipo = 'OTRO',
  titulo = 'Documentos',
  descripcion,
  accept = 'application/pdf',
  puedeEditar = true,
}: Props) {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const query = projectId ? `projectId=${projectId}` : `ingresoId=${ingresoId}`

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/documentos?${query}`)
      setDocumentos(res.ok ? await res.json() : [])
    } catch {
      setDocumentos([])
    } finally {
      setCargando(false)
    }
  }, [query])

  useEffect(() => { cargar() }, [cargar])

  const subir = async (file: File) => {
    setSubiendo(true); setError('')
    const fd = new FormData()
    fd.append('archivo', file)
    fd.append('tipo', tipo)
    if (projectId) fd.append('projectId', projectId)
    if (ingresoId) fd.append('ingresoId', ingresoId)

    try {
      const res = await fetch('/api/documentos', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'No se pudo subir el documento')
      } else {
        await cargar()
      }
    } catch {
      setError('Error de conexión al subir el documento')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const eliminar = async (id: string) => {
    setError('')
    const res = await fetch(`/api/documentos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'No se pudo eliminar el documento')
      return
    }
    await cargar()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-phm-gray">{titulo}</h2>
          {descripcion && <p className="text-xs text-phm-gray-soft mt-0.5">{descripcion}</p>}
        </div>
        {puedeEditar && (
          <>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={subiendo}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 text-phm-gold border border-phm-gold/30 hover:border-phm-gold/60 bg-phm-surface rounded-lg transition-colors disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" /> {subiendo ? 'Subiendo...' : 'Adjuntar'}
            </button>
            <input ref={inputRef} type="file" accept={accept} className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f) }} />
          </>
        )}
      </div>

      {error && (
        <p className="mb-3 px-3 py-2 bg-red-950/60 border border-red-900/60 rounded-lg text-xs text-red-300">{error}</p>
      )}

      {cargando ? (
        <div className="h-12 skeleton-shimmer rounded-lg" />
      ) : documentos.length === 0 ? (
        <p className="text-xs text-phm-gray-soft py-3">Sin documentos adjuntos.</p>
      ) : (
        <ul className="divide-y divide-phm-border-soft">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <FileText className="w-4 h-4 text-phm-gold flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{doc.nombreOriginal}</p>
                <p className="text-xs text-phm-gray-soft">
                  {TIPO_LABELS[doc.tipo] ?? doc.tipo} · {formatoTamano(doc.tamanoBytes)}
                  {doc.numeroFactura ? ` · N.º ${doc.numeroFactura}` : ''}
                </p>
              </div>
              <a href={`/api/documentos/${doc.id}`} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 p-1.5 text-phm-gray hover:text-phm-gold transition-colors"
                aria-label={`Abrir ${doc.nombreOriginal}`}>
                <Download className="w-4 h-4" />
              </a>
              {puedeEditar && (
                <button type="button" onClick={() => eliminar(doc.id)}
                  className="flex-shrink-0 p-1.5 text-phm-gray-soft hover:text-red-400 transition-colors"
                  aria-label={`Eliminar ${doc.nombreOriginal}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
