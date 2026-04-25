import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken } from '@/lib/auth'
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
