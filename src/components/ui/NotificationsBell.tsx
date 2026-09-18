'use client'

import Link from 'next/link'
import { Bell, AlertTriangle, AlertOctagon, Info, Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Alert {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
  href: string
}

const SEVERITY: Record<
  Alert['type'],
  { Icon: React.ElementType; iconClass: string; boxClass: string }
> = {
  danger: {
    Icon: AlertOctagon,
    iconClass: 'text-red-400',
    boxClass: 'bg-red-500/10 border-red-500/20',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-400',
    boxClass: 'bg-amber-500/10 border-amber-500/20',
  },
  info: {
    Icon: Info,
    iconClass: 'text-blue-400',
    boxClass: 'bg-blue-500/10 border-blue-500/20',
  },
}

const REFRESH_MS = 120000 // refresca cada 2 minutos

export default function NotificationsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Carga de alertas al montar + refresco periódico
  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/alerts')
        if (!res.ok) return
        const data = await res.json()
        if (active && Array.isArray(data)) setAlerts(data)
      } catch {
        // error silencioso: no rompemos el header
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  // Cerrar al hacer clic fuera (mismo patrón que la búsqueda)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const count = alerts.length

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative text-phm-gray hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
        aria-label={count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones'}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-phm-charcoal animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 w-[340px] max-w-[calc(100vw-2rem)] bg-phm-charcoal border border-phm-border-soft rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-phm-border-soft">
            <span className="text-sm font-semibold text-white">Notificaciones</span>
            {count > 0 && (
              <span className="text-[11px] font-medium text-phm-gray-soft bg-phm-surface border border-phm-border-soft px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-phm-gray-soft">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white">Todo al día ✓</p>
              <p className="text-xs text-phm-gray-soft">No hay alertas pendientes.</p>
            </div>
          ) : (
            <ul className="py-1.5 max-h-[24rem] overflow-y-auto">
              {alerts.map((a) => {
                const { Icon, iconClass, boxClass } = SEVERITY[a.type] ?? SEVERITY.info
                return (
                  <li key={a.id}>
                    <Link
                      href={a.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                    >
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center border flex-shrink-0 ${boxClass}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white leading-tight">{a.title}</p>
                        <p className="text-xs text-phm-gray-soft leading-snug mt-0.5">{a.message}</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
