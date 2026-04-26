'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const breadcrumbs: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Clientes',
  '/clientes/nuevo': 'Nuevo Cliente',
  '/planes': 'Planes Mensuales',
  '/planes/nuevo': 'Nuevo Plan',
  '/contenidos': 'Contenidos',
  '/contenidos/nuevo': 'Nuevo Contenido',
  '/reportes': 'Reportes',
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()

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
    <header className="h-16 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center px-4 md:px-6 no-print">
      <button
        className="md:hidden mr-3 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
        onClick={onMenuClick}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-2 text-sm">
        {parent && (
          <>
            <Link href={parent.href} className="text-zinc-400 hover:text-zinc-200 transition-colors">
              {parent.label}
            </Link>
            <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
        <span className="font-semibold text-zinc-100">{getTitle()}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
        <span className="text-xs text-zinc-500">Sistema activo</span>
      </div>
    </header>
  )
}
