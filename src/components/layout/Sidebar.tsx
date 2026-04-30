'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarRange,
  FolderKanban,
  Film,
  FileBarChart2,
  DollarSign,
  UsersRound,
  CalendarDays,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { NAV_ROLES, ROLE_LABELS } from '@/lib/permissions'
import BrandLogo from '@/components/ui/BrandLogo'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/servicios', label: 'Servicios', icon: Package },
  { href: '/planes', label: 'Planes Mensuales', icon: CalendarRange },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/contenidos', label: 'Contenidos', icon: Film },
  { href: '/reportes', label: 'Reportes', icon: FileBarChart2 },
  { href: '/ingresos', label: 'Ingresos', icon: DollarSign },
  { href: '/usuarios', label: 'Equipo', icon: UsersRound },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCurrentUser(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const role = currentUser?.role || ''
  const visibleNav = navItems.filter((item) => {
    const allowed = NAV_ROLES[item.href]
    return !allowed || allowed.includes(role)
  })

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside
      className={`fixed left-0 top-0 h-dvh w-64 z-50 flex flex-col transition-transform duration-300 md:translate-x-0 border-r border-phm-border-soft ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ background: 'linear-gradient(180deg, #09090B 0%, #0B0B0E 60%, #050506 100%)' }}
    >
      <div
        aria-hidden
        className="absolute right-0 top-10 bottom-10 w-px"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(201, 168, 76, 0.4), transparent)' }}
      />
      <div
        aria-hidden
        className="absolute -top-20 -left-10 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,0,0,0.18), transparent 70%)' }}
      />

      <button
        className="md:hidden absolute top-4 right-4 text-phm-gray hover:text-white transition-colors z-10"
        onClick={onClose}
        aria-label="Cerrar menu"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative px-5 pt-6 pb-5 border-b border-phm-border-soft">
        <Link href="/dashboard" className="block group" onClick={onClose}>
          <div className="relative rounded-xl overflow-hidden bg-black/60 ring-1 ring-phm-border-soft p-2.5 transition-all group-hover:ring-phm-gold/40">
            <BrandLogo priority />
            <div
              aria-hidden
              className="absolute inset-x-6 top-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(229, 9, 20, 0.6), transparent)',
                boxShadow: '0 0 8px rgba(229,9,20,0.5)',
              }}
            />
          </div>
        </Link>
      </div>

      <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phm-gray-soft">
          Menu principal
        </p>
        {visibleNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'nav-item-active text-white' : 'text-phm-gray hover:text-white hover:bg-white/[0.03]'}`}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 transition-all ${isActive ? 'text-white drop-shadow-[0_0_6px_rgba(229,9,20,0.6)]' : 'text-phm-gray-soft group-hover:text-phm-gold'}`}
                strokeWidth={1.75}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-phm-gold shadow-[0_0_8px_#C9A84C]" />
              )}
            </Link>
          )
        })}

        <div className="mt-6 mx-1">
          <div className="relative rounded-xl border border-phm-border-soft bg-gradient-to-br from-phm-charcoal-2 to-phm-black p-4 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.25), transparent 70%)' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-phm-gold" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-premium">
                  PHMAVERICKS
                </p>
              </div>
              <p className="text-[11px] leading-snug text-phm-gray italic">
                Excelencia en cada entrega.
              </p>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative p-3 border-t border-phm-border-soft">
        <div className="flex items-center gap-3 mb-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-phm-border-soft">
          <div className="relative w-9 h-9 rounded-full flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(135deg, #8B0000 0%, #C9A84C 100%)', padding: '1.5px' }}
            >
              <div className="w-full h-full rounded-full bg-phm-charcoal flex items-center justify-center">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {currentUser?.name || 'Cargando...'}
            </p>
            <p className="text-[11px] truncate text-phm-gold">
              {currentUser ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-phm-gray hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-all border border-transparent hover:border-red-900/50"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
