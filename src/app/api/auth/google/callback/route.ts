import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { exchangeCode } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const redirectError = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/calendario?google=${reason}`, request.url))
    res.cookies.delete('google_oauth_state')
    return res
  }

  // El callback debe ejecutarlo un usuario autenticado con permiso administrativo
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return redirectError('forbidden')

  // Validación anti-CSRF: el state del query debe coincidir con la cookie
  const cookieState = request.cookies.get('google_oauth_state')?.value
  if (!state || !cookieState || state !== cookieState) {
    return redirectError('state')
  }

  if (error || !code) {
    return redirectError('error')
  }

  try {
    const tokens = await exchangeCode(code)

    await prisma.googleToken.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    })

    const res = NextResponse.redirect(new URL('/calendario?google=connected', request.url))
    res.cookies.delete('google_oauth_state')
    return res
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return redirectError('error')
  }
}
