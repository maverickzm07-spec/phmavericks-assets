import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents, canDeleteData } from '@/lib/permissions'
import { z } from 'zod'

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  modalidad: z.enum(['MENSUAL', 'OCASIONAL']).optional(),
  estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'EN_EDICION', 'APROBADO', 'ENTREGADO', 'COMPLETADO', 'ATRASADO']).optional(),
  serviceId: z.string().nullable().optional(),
  monthlyPlanId: z.string().nullable().optional(),
  linkEntrega: z.string().url().optional().or(z.literal('')),
  fechaEntrega: z.string().nullable().optional(),
  observaciones: z.string().optional(),
})

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const project = await prisma.clientProject.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, business: true } },
      service: { select: { id: true, nombre: true, tipo: true, modalidad: true, precio: true } },
      monthlyPlan: { select: { id: true, month: true, year: true } },
      contents: {
        orderBy: { createdAt: 'asc' },
        include: { client: { select: { id: true, name: true } } },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const project = await prisma.clientProject.update({
      where: { id: params.id },
      data: {
        ...data,
        linkEntrega: data.linkEntrega || null,
        fechaEntrega: data.fechaEntrega ? new Date(data.fechaEntrega) : data.fechaEntrega === null ? null : undefined,
        serviceId: data.serviceId === undefined ? undefined : (data.serviceId || null),
        monthlyPlanId: data.monthlyPlanId === undefined ? undefined : (data.monthlyPlanId || null),
      },
      include: {
        client: { select: { id: true, name: true, business: true } },
        service: { select: { id: true, nombre: true, tipo: true } },
        contents: true,
      },
    })

    // Si se marca como COMPLETADO, revisar si todos los entregables están listos
    if (data.estado === 'COMPLETADO') {
      const pending = project.contents.filter((c) => !DONE_STATUSES.includes(c.status))
      if (pending.length > 0) {
        // Actualizar entregables pendientes a ENTREGADO automáticamente
        await prisma.content.updateMany({
          where: { projectId: params.id, status: { notIn: DONE_STATUSES as any[] } },
          data: { status: 'ENTREGADO' },
        })
      }
    }

    return NextResponse.json(project)
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
  if (!canDeleteData(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // Los contenidos del proyecto se desvinculan (SetNull en schema)
  await prisma.clientProject.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
