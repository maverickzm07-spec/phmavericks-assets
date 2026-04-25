import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canManageUsers } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  cedula: z.string().regex(/^\d{10}$/, 'La cédula debe tener exactamente 10 dígitos').optional().or(z.literal('')),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA']),
  activo: z.boolean().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageUsers(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const found = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, cedula: true, role: true, activo: true, createdAt: true },
  })
  if (!found) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(found)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageUsers(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const target = await prisma.user.findUnique({ where: { id: params.id } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // No se puede desactivar al único SUPER_ADMIN
    if (target.role === 'SUPER_ADMIN' && data.activo === false) {
      const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN', activo: true } })
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: 'No puedes desactivar el único Super Admin activo' }, { status: 400 })
      }
    }

    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: params.id } },
    })
    if (existing) return NextResponse.json({ error: 'El correo ya está en uso por otro usuario' }, { status: 409 })

    if (data.cedula) {
      const existingCedula = await prisma.user.findFirst({
        where: { cedula: data.cedula, NOT: { id: params.id } },
      })
      if (existingCedula) return NextResponse.json({ error: 'La cédula ya está registrada en otro usuario' }, { status: 409 })
    }

    const updateData: any = {
      name: data.name,
      email: data.email,
      cedula: data.cedula || null,
      role: data.role,
    }
    if (data.activo !== undefined) updateData.activo = data.activo
    if (data.password && data.password.length >= 6) {
      updateData.password = await bcrypt.hash(data.password, 12)
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, cedula: true, role: true, activo: true, createdAt: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageUsers(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  if (user.userId === params.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  if (target.role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: 'No puedes eliminar el único Super Admin del sistema' }, { status: 400 })
    }
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
