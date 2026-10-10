'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import TabBarMovil from './TabBarMovil'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh bg-phm-black">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col md:ml-64 overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* En móvil se reserva sitio para la barra inferior y el área segura
            del teléfono; en escritorio no hay barra, así que vuelve al normal. */}
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(88px+env(safe-area-inset-bottom,0px))] animate-fade-in md:p-7 md:pb-7 lg:p-10 lg:pb-10">
          {children}
        </main>
      </div>
      <TabBarMovil />
    </div>
  )
}
