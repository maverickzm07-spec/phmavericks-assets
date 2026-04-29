import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import {
  getValidAccessToken,
  createGoogleEvent,
  updateGoogleEvent,
  listGoogleEvents,
  buildDescription,
  type GoogleEvent,
} from '@/lib/google-calendar'

// Convierte un evento de Google a fechas válidas para PHM.
// Acepta dateTime (con hora) o date (día completo → 09:00–10:00).
function parseGoogleDates(gEv: GoogleEvent): { start: Date; end: Date } | null {
  try {
    let startStr = gEv.start?.dateTime
    let endStr = gEv.end?.dateTime

    // Evento de día completo: usar 09:00–10:00 del día
    if (!startStr && gEv.start?.date) startStr = `${gEv.start.date}T09:00:00`
    if (!endStr && gEv.end?.date) {
      // Google end.date es exclusivo (día siguiente), usamos la misma fecha que start
      const d = gEv.start?.date || gEv.end.date
      endStr = `${d}T10:00:00`
    }

    if (!startStr || !endStr) return null

    const start = new Date(startStr)
    const end = new Date(endStr)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    if (end <= start) return null

    return { start, end }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch {
    return NextResponse.json({ error: 'Google Calendar no conectado' }, { status: 400 })
  }

  const timeMin = new Date()
  timeMin.setMonth(timeMin.getMonth() - 6)
  const timeMax = new Date()
  timeMax.setFullYear(timeMax.getFullYear() + 2)

  let phmToGoogle = 0
  let googleToPHM = 0
  let cancelled = 0
  const errorDetails: string[] = []

  // ── 1. PHM → Google ──────────────────────────────────────────
  const phmEvents = await prisma.calendarEvent.findMany({
    where: { status: { not: 'CANCELADO' } },
  })

  for (const ev of phmEvents) {
    const payload = {
      title: ev.title,
      startDateTime: ev.startDateTime.toISOString(),
      endDateTime: ev.endDateTime.toISOString(),
      location: ev.location,
      description: buildDescription(ev.type, ev.clientName, ev.notes),
    }
    try {
      if (ev.googleEventId) {
        const result = await updateGoogleEvent(accessToken, ev.googleEventId, payload)
        if (result === null) {
          const created = await createGoogleEvent(accessToken, payload)
          await prisma.calendarEvent.update({
            where: { id: ev.id },
            data: { googleEventId: created.id, syncStatus: 'SYNCED' },
          })
        } else {
          await prisma.calendarEvent.update({ where: { id: ev.id }, data: { syncStatus: 'SYNCED' } })
        }
      } else {
        const created = await createGoogleEvent(accessToken, payload)
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { googleEventId: created.id, syncStatus: 'SYNCED' },
        })
      }
      phmToGoogle++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`PHM→Google "${ev.title}":`, msg)
      errorDetails.push(`PHM→Google "${ev.title}": ${msg}`)
      await prisma.calendarEvent.update({ where: { id: ev.id }, data: { syncStatus: 'ERROR' } }).catch(() => {})
    }
  }

  // ── 2. Google → PHM ──────────────────────────────────────────
  let googleEvents: GoogleEvent[]
  try {
    googleEvents = await listGoogleEvents(accessToken, timeMin, timeMax)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Error listando Google Calendar:', msg)
    return NextResponse.json({
      synced: phmToGoogle,
      phmToGoogle,
      googleToPHM: 0,
      cancelled: 0,
      errors: errorDetails.length + 1,
      errorDetails: [...errorDetails, `Google Calendar: ${msg}`],
    })
  }

  // Mapa googleEventId → evento PHM (incluye los recién actualizados)
  const phmByGoogleId = await prisma.calendarEvent.findMany({
    where: { googleEventId: { not: null } },
    select: { id: true, googleEventId: true, updatedAt: true },
  })
  const phmGoogleMap = new Map(phmByGoogleId.map(e => [e.googleEventId!, e]))

  for (const gEv of googleEvents) {
    // ── Primero verificar si está cancelado (puede no tener fechas) ──
    if (gEv.status === 'cancelled') {
      const existing = phmGoogleMap.get(gEv.id)
      if (existing) {
        try {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: { status: 'CANCELADO', syncStatus: 'SYNCED' },
          })
          cancelled++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errorDetails.push(`Cancelar "${gEv.summary || gEv.id}": ${msg}`)
        }
      }
      continue
    }

    // ── Parsear fechas (dateTime o date) ──
    const dates = parseGoogleDates(gEv)
    if (!dates) {
      // Evento sin fechas válidas, saltar silenciosamente
      continue
    }

    const existing = phmGoogleMap.get(gEv.id)

    if (existing) {
      // Actualizar si Google es más reciente
      const googleUpdated = gEv.updated ? new Date(gEv.updated) : new Date(0)
      if (isNaN(googleUpdated.getTime()) || googleUpdated > existing.updatedAt) {
        try {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: {
              title: gEv.summary?.trim() || 'Sin título',
              startDateTime: dates.start,
              endDateTime: dates.end,
              location: gEv.location?.trim() || null,
              notes: gEv.description?.trim() || null,
              syncStatus: 'SYNCED',
            },
          })
          googleToPHM++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`Google→PHM actualizar "${gEv.summary}":`, msg)
          errorDetails.push(`Google→PHM actualizar "${gEv.summary || gEv.id}": ${msg}`)
        }
      }
    } else {
      // Evento nuevo en Google → crear en PHM
      try {
        await prisma.calendarEvent.create({
          data: {
            title: gEv.summary?.trim() || 'Sin título',
            type: 'OTRO',
            startDateTime: dates.start,
            endDateTime: dates.end,
            location: gEv.location?.trim() || null,
            notes: gEv.description?.trim() || null,
            status: 'AGENDADO',
            source: 'GOOGLE',
            googleEventId: gEv.id,
            syncStatus: 'SYNCED',
          },
        })
        googleToPHM++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Google→PHM crear "${gEv.summary}":`, msg)
        errorDetails.push(`Google→PHM crear "${gEv.summary || gEv.id}": ${msg}`)
      }
    }
  }

  const total = phmToGoogle + googleToPHM + cancelled
  return NextResponse.json({
    synced: total,
    phmToGoogle,
    googleToPHM,
    cancelled,
    errors: errorDetails.length,
    errorDetails,
  })
}
