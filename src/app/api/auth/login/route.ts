import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken } from '@/lib/auth'
import { rateLimit, resetRateLimit, getClientIp } from '@/lib/rateLimit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Límite de intentos: 5 por IP+email cada 10 minutos (anti fuerza bruta)
    const ip = getClientIp(request)
    const rlKey = `login:${ip}:${email.toLowerCase()}`
    const rl = rateLimit(rlKey, 5, 10 * 60 * 1000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Vuelve a intentar en ${Math.ceil(rl.retryAfter / 60)} minuto(s).` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (!user.activo) {
      return NextResponse.json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Login correcto: liberar el contador de intentos de esta IP+email
    resetRateLimit(rlKey)

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })

    response.cookies.set('phm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
