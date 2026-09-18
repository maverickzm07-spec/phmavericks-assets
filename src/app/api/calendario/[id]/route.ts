import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'
import { getValidAccessToken, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, buildDescription } from '@/lib/google-calendar'

const eventSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['GRABACION', 'SESION_FOTOGRAFICA', 'REUNION', 'ENTREGA', 'EDICION', 'EVENTO', 'OTRO']).optional(),
  startDateTime: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'startDateTime inválido' }).optional(),
  endDateTime: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'endDateTime inválido' }).optional(),
  location: z.string().nullish(),
  notes: z.string().nullish(),
  clientId: z.string().nullish(),
  clientName: z.string().nullish(),
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

    // Actualizar en Google Calendar si está conectado
    try {
      const accessToken = await getValidAccessToken()
      const payload = {
        title: event.title,
        startDateTime: event.startDateTime.toISOString(),
        endDateTime: event.endDateTime.toISOString(),
        location: event.location,
        description: buildDescription(event.type, event.clientName, event.notes),
      }
      if (event.googleEventId) {
        const result = await updateGoogleEvent(accessToken, event.googleEventId, payload)
        if (result === null) {
          // Fue eliminado en Google, lo recreamos
          const created = await createGoogleEvent(accessToken, payload)
          await prisma.calendarEvent.update({
            where: { id: event.id },
            data: { googleEventId: created.id, syncStatus: 'SYNCED' },
          })
        } else {
          await prisma.calendarEvent.update({ where: { id: event.id }, data: { syncStatus: 'SYNCED' } })
        }
      } else {
        const created = await createGoogleEvent(accessToken, payload)
        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: { googleEventId: created.id, syncStatus: 'SYNCED' },
        })
      }
    } catch {
      // Sin Google conectado: continuar sin error
    }

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: `Datos inválidos: ${details}` }, { status: 400 })
    }
    console.error('PUT /api/calendario/[id] error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const event = await prisma.calendarEvent.findUnique({ where: { id: params.id } })

  // Eliminar en Google Calendar si está conectado
  if (event?.googleEventId) {
    try {
      const accessToken = await getValidAccessToken()
      await deleteGoogleEvent(accessToken, event.googleEventId)
    } catch {
      // Sin Google conectado: continuar sin error
    }
  }

  await prisma.calendarEvent.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
