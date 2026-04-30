'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, Search, Bell, ChevronRight, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'

const breadcrumbs: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Clientes',
  '/clientes/nuevo': 'Nuevo Cliente',
  '/planes': 'Planes Mensuales',
  '/planes/nuevo': 'Nuevo Plan',
  '/contenidos': 'Contenidos',
  '/contenidos/nuevo': 'Nuevo Contenido',
  '/reportes': 'Reportes',
  '/ingresos': 'Ingresos',
  '/proyectos': 'Proyectos',
  '/servicios': 'Servicios',
  '/usuarios': 'Equipo',
  '/calendario': 'Calendario',
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    const fmt = () => {
      try {
        const d = new Date()
        const formatted = new Intl.DateTimeFormat('es-EC', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(d)
        setNow(formatted.replace(/\./g, '').replace(/^./, (c) => c.toUpperCase()))
      } catch {
        setNow(new Date().toDateString())
      }
    }
    fmt()
    const id = setInterval(fmt, 60000)
    return () => clearInterval(id)
  }, [])

  const getTitle = () => {
    if (breadcrumbs[pathname]) return breadcrumbs[pathname]
    if (pathname.includes('/clientes/')) return 'Detalle de Cliente'
    if (pathname.includes('/planes/')) return 'Detalle de Plan'
    if (pathname.includes('/contenidos/')) return 'Detalle de Contenido'
    if (pathname.includes('/reportes/')) return 'Reporte Mensual'
    return 'PHM Sistema'
  }

  const getParent = () => {
    if (pathname.includes('/clientes/') && pathname !== '/clientes/nuevo') return { href: '/clientes', label: 'Clientes' }
    if (pathname.includes('/planes/') && pathname !== '/planes/nuevo') return { href: '/planes', label: 'Planes' }
    if (pathname.includes('/contenidos/') && pathname !== '/contenidos/nuevo') return { href: '/contenidos', label: 'Contenidos' }
    if (pathname.includes('/reportes/') && pathname !== '/reportes') return { href: '/reportes', label: 'Reportes' }
    return null
  }

  const parent = getParent()

  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-phm-border-soft flex items-center px-4 md:px-6 no-print">
      <button
        className="md:hidden mr-3 text-phm-gray hover:text-white transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 text-sm min-w-0">
        {parent && (
          <>
            <Link href={parent.href} className="text-phm-gray hover:text-white transition-colors truncate">
              {parent.label}
            </Link>
            <ChevronRight className="w-4 h-4 text-phm-gray-soft flex-shrink-0" />
          </>
        )}
        <span className="font-semibold text-white truncate">{getTitle()}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg bg-phm-charcoal border border-phm-border-soft hover:border-phm-gold/30 transition-colors w-64">
          <Search className="w-4 h-4 text-phm-gray-soft" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent outline-none text-sm text-white placeholder:text-phm-gray-soft flex-1 min-w-0"
          />
          <kbd className="hidden xl:inline-flex items-center px-1.5 h-5 text-[10px] font-mono text-phm-gray-soft bg-phm-charcoal-2 border border-phm-border-soft rounded">
            CTRL+K
          </kbd>
        </div>

        <button
          className="lg:hidden text-phm-gray hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          aria-label="Buscar"
        >
          <Search className="w-4 h-4" />
        </button>

        <button className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-phm-charcoal border border-phm-border-soft hover:border-phm-gold/30 text-xs font-medium text-phm-gray hover:text-white transition-all">
          <Calendar className="w-3.5 h-3.5 text-phm-gold" />
          <span className="tabular-nums">{now || '—'}</span>
        </button>

        <button
          className="relative text-phm-gray hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-phm-charcoal animate-pulse" />
        </button>

        <div className="hidden md:flex items-center gap-2 ml-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-[11px] uppercase tracking-wider text-phm-gray-soft">Online</span>
        </div>
      </div>
    </header>
  )
}
