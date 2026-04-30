'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div
            className="absolute -top-40 right-1/4 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(139,0,0,0.15), transparent 60%)' }}
          />
          <div
            className="absolute bottom-0 left-1/3 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.10), transparent 60%)' }}
          />
        </div>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
