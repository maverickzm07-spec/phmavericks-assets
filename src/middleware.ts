import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Este archivo debe vivir en src/ junto a app/. Estuvo en la raíz del proyecto, donde
// Next.js no lo carga cuando existe el directorio src/, así que el middleware nunca
// llegó a ejecutarse y las páginas protegidas se renderizaban sin sesión.

const RAW_SECRET = process.env.JWT_SECRET
if (!RAW_SECRET || RAW_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres). ' +
    'Define una cadena aleatoria larga en las variables de entorno antes de arrancar la aplicación.'
  )
}
const SECRET = new TextEncoder().encode(RAW_SECRET)

// Rutas accesibles sin sesión: login y los portales públicos de entrega.
const publicPaths = ['/login', '/api/auth/login', '/entrega/', '/api/public/', '/cliente/', '/e/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Las rutas de API responden 401 en JSON; redirigirlas rompería el manejo de
  // errores del frontend, que distingue "sesión caducada" por ese código.
  const isApi = pathname.startsWith('/api/')
  const rechazar = () => {
    if (isApi) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('phm_token')
    return response
  }

  const token = request.cookies.get('phm_token')?.value
  if (!token) return rechazar()

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    return rechazar()
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clientes/:path*',
    // Ya no hay páginas de planes; su API se conserva para el histórico.
    '/contenidos/:path*',
    '/reportes/:path*',
    // Proyectos y calendario quedaban fuera del matcher: sus APIs sí devolvían 401,
    // pero las páginas se renderizaban sin sesión y fallaban en silencio.
    '/proyectos/:path*',
    '/calendario/:path*',
    '/servicios/:path*',
    '/ingresos/:path*',
    '/gastos/:path*',
    '/finanzas/:path*',
    '/usuarios/:path*',
    '/api/proyectos/:path*',
    '/api/calendario/:path*',
    '/api/clientes/:path*',
    '/api/planes/:path*',
    '/api/contenidos/:path*',
    '/api/dashboard/:path*',
    '/api/reportes/:path*',
    '/api/ingresos/:path*',
    '/api/gastos/:path*',
    '/api/finanzas/:path*',
    '/api/documentos/:path*',
    '/api/servicios/:path*',
    '/api/usuarios/:path*',
    '/api/auth/logout',
    '/api/auth/me',
  ],
}
