import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canManageUsers } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  cedula: z.string().regex(/^\d{10}$/, 'La cédula debe tener exactamente 10 dígitos').optional().or(z.literal('')),
  password: z.string().min(6),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA']).default('VENTAS'),
  activo: z.boolean().default(true),
  verificationCode: z.string().length(6, 'El código debe tener 6 dígitos'),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageUsers(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, cedula: true, role: true, activo: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageUsers(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

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

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 409 })

    if (data.cedula) {
      const existingCedula = await prisma.user.findUnique({ where: { cedula: data.cedula } })
      if (existingCedula) return NextResponse.json({ error: 'La cédula ya está registrada' }, { status: 409 })
    }

    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } })

    const hashed = await bcrypt.hash(data.password, 12)
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        cedula: data.cedula || null,
        password: hashed,
        role: data.role,
        activo: data.activo,
      },
      select: { id: true, name: true, email: true, cedula: true, role: true, activo: true, createdAt: true },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
