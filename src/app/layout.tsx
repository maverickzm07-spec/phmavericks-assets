import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Geométrica, muy legible en pantalla pequeña y con el aire de producto
// técnico que busca el rediseño. next/font la sirve desde el propio dominio:
// sin petición a Google en tiempo de carga y sin salto de texto.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PHM Sistema | PHMavericks',
  description: 'Sistema de gestión de contenidos para PHMavericks',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin esto, env(safe-area-inset-*) vale siempre 0 y la barra inferior se
  // mete debajo del indicador del iPhone. No se fija maximumScale ni
  // userScalable: el zoom del navegador tiene que seguir disponible.
  viewportFit: 'cover',
  themeColor: '#050505',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  )
}
