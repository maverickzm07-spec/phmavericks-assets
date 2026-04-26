import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'phm-default-secret-change-in-production-2026'
)

const publicPaths = ['/login', '/api/auth/login']

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
