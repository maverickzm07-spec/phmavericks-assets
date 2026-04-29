import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'
import { getValidAccessToken, createGoogleEvent, buildDescription } from '@/lib/google-calendar'

const eventSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['GRABACION', 'SESION_FOTOGRAFICA', 'REUNION', 'ENTREGA', 'EDICION', 'EVENTO', 'OTRO']).default('OTRO'),
  startDateTime: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'startDateTime inválido' }),
  endDateTime: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'endDateTime inválido' }),
  location: z.string().nullish(),
  notes: z.string().nullish(),
  clientId: z.string().nullish(),
  clientName: z.string().nullish(),
  status: z.enum(['AGENDADO', 'REALIZADO', 'CANCELADO']).default('AGENDADO'),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const date = searchParams.get('date')

  let where = {}

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    where = {
      OR: [
        { startDateTime: { gte: start, lte: end } },
        { endDateTime: { gte: start, lte: end } },
        { startDateTime: { lte: start }, endDateTime: { gte: end } },
      ],
    }
  } else if (year && month) {
    const y = parseInt(year)
    const m = parseInt(month)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59, 999)
    where = {
      OR: [
        { startDateTime: { gte: start, lte: end } },
        { endDateTime: { gte: start, lte: end } },
        { startDateTime: { lte: start }, endDateTime: { gte: end } },
      ],
    }
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startDateTime: 'asc' },
  })

  return NextResponse.json(events)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const data = eventSchema.parse(body)

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        type: data.type,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
        location: data.location || null,
        notes: data.notes || null,
        clientId: data.clientId || null,
        clientName: data.clientName || null,
        status: data.status,
        source: 'PHM',
        syncStatus: 'PENDING',
      },
    })

    // Empujar a Google Calendar si está conectado
    try {
      const accessToken = await getValidAccessToken()
      const gEvent = await createGoogleEvent(accessToken, {
        title: event.title,
        startDateTime: event.startDateTime.toISOString(),
        endDateTime: event.endDateTime.toISOString(),
        location: event.location,
        description: buildDescription(event.type, event.clientName, event.notes),
      })
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { googleEventId: gEvent.id, syncStatus: 'SYNCED' },
      })
      event.googleEventId = gEvent.id
      event.syncStatus = 'SYNCED' as typeof event.syncStatus
    } catch {
      // Sin Google conectado: continuar sin error
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: `Datos inválidos: ${details}` }, { status: 400 })
    }
    console.error('POST /api/calendario error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
