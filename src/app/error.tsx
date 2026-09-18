'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ backgroundColor: '#09090b', color: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center', padding: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Error del sistema</h2>
          <p style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '1.5rem' }}>
            No se pudo cargar la aplicación.
          </p>
          <button
            onClick={reset}
            style={{ backgroundColor: '#8B0000', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  )
}
