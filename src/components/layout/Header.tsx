'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Search, Bell, ChevronRight, Calendar, User, Folder, FileText, CalendarDays, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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

const TYPE_ICON: Record<string, React.ElementType> = {
  cliente: User,
  proyecto: Folder,
  plan: CalendarDays,
  contenido: FileText,
  evento: Calendar,
}

const TYPE_LABEL: Record<string, string> = {
  cliente: 'Cliente',
  proyecto: 'Proyecto',
  plan: 'Plan',
  contenido: 'Contenido',
  evento: 'Evento',
}

interface SearchResult {
  id: string
  type: 'cliente' | 'proyecto' | 'plan' | 'contenido' | 'evento'
  title: string
  subtitle: string
  href: string
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [now, setNow] = useState<string>('')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setIsOpen(true)
        }
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Ctrl+K focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        if (results.length > 0) setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [results])

  const handleSelect = (href: string) => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    router.push(href)
  }

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
        {/* Search — desktop */}
        <div ref={searchContainerRef} className="relative hidden lg:block">
          <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-phm-charcoal border border-phm-border-soft hover:border-phm-gold/30 transition-colors w-64 focus-within:border-phm-gold/50">
            {searching ? (
              <Loader2 className="w-4 h-4 text-phm-gray-soft animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-phm-gray-soft flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setIsOpen(true) }}
              placeholder="Buscar..."
              className="bg-transparent outline-none text-sm text-white placeholder:text-phm-gray-soft flex-1 min-w-0"
            />
            {!query && (
              <kbd className="hidden xl:inline-flex items-center px-1.5 h-5 text-[10px] font-mono text-phm-gray-soft bg-phm-charcoal-2 border border-phm-border-soft rounded">
                CTRL+K
              </kbd>
            )}
          </div>

          {/* Dropdown results */}
          {isOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-full min-w-[320px] bg-phm-charcoal border border-phm-border-soft rounded-xl shadow-2xl overflow-hidden z-50">
              {results.length === 0 ? (
                <p className="text-sm text-phm-gray-soft text-center py-4 px-4">Sin resultados para &ldquo;{query}&rdquo;</p>
              ) : (
                <ul className="py-1.5 max-h-72 overflow-y-auto">
                  {results.map((r) => {
                    const Icon = TYPE_ICON[r.type] ?? Search
                    return (
                      <li key={r.id + r.type}>
                        <button
                          onClick={() => handleSelect(r.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                        >
                          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-phm-surface border border-phm-border-soft flex-shrink-0 group-hover:border-phm-gold/30">
                            <Icon className="w-3.5 h-3.5 text-phm-gray-soft" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate leading-tight">{r.title}</p>
                            {r.subtitle && (
                              <p className="text-xs text-phm-gray-soft truncate leading-tight">{r.subtitle}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-phm-gray-soft bg-phm-surface border border-phm-border-soft px-1.5 py-0.5 rounded flex-shrink-0">
                            {TYPE_LABEL[r.type]}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Search icon — mobile */}
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
