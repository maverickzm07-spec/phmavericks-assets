import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['GRABACION', 'SESION_FOTOGRAFICA', 'REUNION', 'ENTREGA', 'EDICION', 'EVENTO', 'OTRO']).optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  status: z.enum(['AGENDADO', 'REALIZADO', 'CANCELADO']).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const event = await prisma.calendarEvent.findUnique({ where: { id: params.id } })
  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  return NextResponse.json(event)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = eventSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.type !== undefined) updateData.type = data.type
    if (data.startDateTime !== undefined) updateData.startDateTime = new Date(data.startDateTime)
    if (data.endDateTime !== undefined) updateData.endDateTime = new Date(data.endDateTime)
    if ('location' in data) updateData.location = data.location || null
    if ('notes' in data) updateData.notes = data.notes || null
    if ('clientId' in data) updateData.clientId = data.clientId || null
    if ('clientName' in data) updateData.clientName = data.clientName || null
    if (data.status !== undefined) updateData.status = data.status

    const event = await prisma.calendarEvent.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(event)
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

  await prisma.calendarEvent.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
