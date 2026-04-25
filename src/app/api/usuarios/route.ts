import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'EDITOR']).default('ADMIN'),
  verificationCode: z.string().length(6, 'El código debe tener 6 dígitos'),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    // Validar código de verificación
    const record = await prisma.verificationCode.findFirst({
      where: {
        email: data.email,
        code: data.verificationCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) {
      return NextResponse.json(
        { error: 'Código incorrecto o expirado. Solicita un nuevo código.' },
        { status: 400 }
      )
    }

    // Verificar que el email no esté ya registrado
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 409 })

    // Marcar código como usado
    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } })

    // Crear usuario
    const hashed = await bcrypt.hash(data.password, 12)
    const newUser = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashed, role: data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
