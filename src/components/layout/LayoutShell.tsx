'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import TabBarMovil from './TabBarMovil'

/**
 * Armazón de la aplicación.
 *
 * El scroll es el del documento, no el de un contenedor interno. Antes el
 * armazón medía `h-dvh` con `overflow-hidden` y el scroll vivía dentro de
 * `<main>`; eso provocaba tres problemas en el teléfono:
 *
 *  - el navegador no podía colapsar su barra de direcciones, porque esa
 *    animación solo ocurre cuando quien desplaza es el documento. Al cambiar
 *    `dvh` con la barra, el alto del armazón saltaba;
 *  - al abrir el teclado, el contenedor se recortaba y el contenido se movía;
 *  - la posición de lectura se perdía al recargar, porque el navegador solo
 *    restaura el scroll del documento.
 *
 * Ahora el armazón solo marca el alto mínimo. La cabecera es `sticky`, el
 * menú lateral y la barra inferior son `fixed`: el aspecto es el mismo y el
 * desplazamiento es el nativo.
 */
export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-phm-black">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-dvh flex-col md:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* En móvil se reserva sitio para la barra inferior y el área segura
            del teléfono; en escritorio no hay barra, así que vuelve al normal. */}
        <main className="flex-1 p-4 pb-[calc(88px+env(safe-area-inset-bottom,0px))] animate-fade-in md:p-7 md:pb-7 lg:p-10 lg:pb-10">
          {children}
        </main>
      </div>

      <TabBarMovil />
    </div>
  )
}
