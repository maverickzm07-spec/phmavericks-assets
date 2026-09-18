import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getAuthUrl } from '@/lib/google-calendar'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // Conectar la cuenta de Google (token global) es una acción administrativa
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.redirect(new URL('/calendario?google=forbidden', request.url))
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.redirect(new URL('/calendario?google=no-config', request.url))
  }

  // state anti-CSRF: se guarda en cookie httpOnly y se valida en el callback
  const state = randomBytes(16).toString('hex')
  const response = NextResponse.redirect(getAuthUrl(state))
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })
  return response
}
