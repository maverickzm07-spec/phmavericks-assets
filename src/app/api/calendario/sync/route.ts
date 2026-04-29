import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getValidAccessToken, createGoogleEvent, updateGoogleEvent } from '@/lib/google-calendar'
import { TYPE_LABELS_ES } from '@/lib/calendar-constants'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch {
    return NextResponse.json({ error: 'Google Calendar no conectado' }, { status: 400 })
  }

  const events = await prisma.calendarEvent.findMany({
    where: { status: { not: 'CANCELADO' } },
    orderBy: { startDateTime: 'asc' },
  })

  let synced = 0
  let errors = 0

  for (const ev of events) {
    const descParts: string[] = []
    if (ev.type && ev.type !== 'OTRO') descParts.push(`Tipo: ${TYPE_LABELS_ES[ev.type] || ev.type}`)
    if (ev.clientName) descParts.push(`Cliente: ${ev.clientName}`)
    if (ev.notes) descParts.push(`\n${ev.notes}`)
    const description = descParts.join('\n') || undefined

    const payload = {
      title: ev.title,
      startDateTime: ev.startDateTime.toISOString(),
      endDateTime: ev.endDateTime.toISOString(),
      location: ev.location,
      description,
    }

    try {
      if (ev.googleEventId) {
        const result = await updateGoogleEvent(accessToken, ev.googleEventId, payload)
        if (result === null) {
          // Evento eliminado en Google, lo recreamos
          const created = await createGoogleEvent(accessToken, payload)
          await prisma.calendarEvent.update({
            where: { id: ev.id },
            data: { googleEventId: created.id, syncStatus: 'SYNCED' },
          })
        } else {
          await prisma.calendarEvent.update({
            where: { id: ev.id },
            data: { syncStatus: 'SYNCED' },
          })
        }
      } else {
        const created = await createGoogleEvent(accessToken, payload)
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { googleEventId: created.id, syncStatus: 'SYNCED' },
        })
      }
      synced++
    } catch (err) {
      console.error(`Error sincronizando evento ${ev.id}:`, err)
      await prisma.calendarEvent.update({
        where: { id: ev.id },
        data: { syncStatus: 'ERROR' },
      })
      errors++
    }
  }

  return NextResponse.json({ synced, errors, total: events.length })
}
