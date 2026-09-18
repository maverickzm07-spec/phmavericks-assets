import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const RAW_SECRET = process.env.JWT_SECRET
if (!RAW_SECRET || RAW_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres). ' +
    'Define una cadena aleatoria larga en las variables de entorno antes de arrancar la aplicación.'
  )
}
const SECRET = new TextEncoder().encode(RAW_SECRET)

const publicPaths = ['/login', '/api/auth/login', '/entrega/', '/api/public/', '/cliente/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('phm_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('phm_token')
    return response
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clientes/:path*',
    '/planes/:path*',
    '/contenidos/:path*',
    '/reportes/:path*',
    '/api/clientes/:path*',
    '/api/planes/:path*',
    '/api/contenidos/:path*',
    '/api/dashboard/:path*',
    '/api/reportes/:path*',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/usuarios/:path*',
    '/usuarios/:path*',
    '/servicios/:path*',
    '/api/servicios/:path*',
    '/ingresos/:path*',
    '/api/ingresos/:path*',
  ],
}
