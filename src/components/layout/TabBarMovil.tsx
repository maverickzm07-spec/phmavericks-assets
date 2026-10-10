'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, FolderKanban, Home, Plus } from 'lucide-react'

/**
 * Navegación inferior para teléfono.
 *
 * Solo caben cinco destinos y el sistema tiene diez secciones: aquí van los
 * cuatro de uso diario más el botón de crear. El resto (Clientes, Gastos,
 * Reportes, Servicios, Equipo) vive en el menú lateral, que en móvil se abre
 * desde la cabecera.
 *
 * Se oculta en escritorio, donde manda el sidebar.
 */

const DESTINOS = [
  { href: '/dashboard', etiqueta: 'Inicio', icono: Home },
  { href: '/proyectos', etiqueta: 'Proyectos', icono: FolderKanban },
  { href: '/finanzas', etiqueta: 'Finanzas', icono: BarChart3 },
  { href: '/calendario', etiqueta: 'Agenda', icono: CalendarDays },
]

export default function TabBarMovil() {
  const pathname = usePathname()

  const esActivo = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Dos destinos a cada lado del botón central.
  const izquierda = DESTINOS.slice(0, 2)
  const derecha = DESTINOS.slice(2)

  const Boton = ({ href, etiqueta, icono: Icono }: (typeof DESTINOS)[number]) => {
    const activo = esActivo(href)
    return (
      <Link
        href={href}
        aria-current={activo ? 'page' : undefined}
        className={`relative flex flex-col items-center gap-1 pt-2 pb-0.5 text-[9.5px] font-semibold transition-colors ${
          activo ? 'text-white' : 'text-phm-gray-soft hover:text-phm-gray'
        }`}
      >
        {activo && (
          <span
            aria-hidden
            className="absolute -top-[9px] h-[2.5px] w-5 rounded-full bg-phm-red-bright"
            style={{ boxShadow: '0 0 10px rgba(196,30,30,.9)' }}
          />
        )}
        <Icono className="h-[19px] w-[19px]" strokeWidth={2} />
        <span>{etiqueta}</span>
      </Link>
    )
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-white/[0.08] md:hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(5,5,5,.80), rgba(5,5,5,.97))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        paddingTop: '8px',
      }}
    >
      {izquierda.map((d) => <Boton key={d.href} {...d} />)}

      <div className="-mt-5 flex justify-center">
        <Link
          href="/proyectos/nuevo"
          aria-label="Nuevo proyecto"
          className="grid h-[50px] w-[50px] place-items-center rounded-[17px] text-white transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(145deg, #C41E1E, #660000)',
            boxShadow: '0 6px 20px rgba(139,0,0,.6), inset 0 1px 0 rgba(255,255,255,.2)',
          }}
        >
          <Plus className="h-[22px] w-[22px]" strokeWidth={2.6} />
        </Link>
      </div>

      {derecha.map((d) => <Boton key={d.href} {...d} />)}
    </nav>
  )
}
