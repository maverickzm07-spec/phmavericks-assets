import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PHM Sistema | PHMavericks',
  description: 'Sistema de gestión de contenidos para PHMavericks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
