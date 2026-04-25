import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR']),
  password: z.string().min(6).optional().or(z.literal('')),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const found = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!found) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(found)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: params.id } },
    })
    if (existing) return NextResponse.json({ error: 'El correo ya está en uso por otro usuario' }, { status: 409 })

    const updateData: any = { name: data.name, email: data.email, role: data.role }
    if (data.password && data.password.length >= 6) {
      updateData.password = await bcrypt.hash(data.password, 12)
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // No permitir eliminarse a sí mismo
  if (user.userId === params.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 })
  }

  const total = await prisma.user.count()
  if (total <= 1) {
    return NextResponse.json({ error: 'Debe existir al menos un usuario en el sistema' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
