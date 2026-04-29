import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import {
  getValidAccessToken,
  createGoogleEvent,
  updateGoogleEvent,
  listGoogleEvents,
  buildDescription,
  isReadOnlyGoogleEvent,
  isReadOnlyError,
  type GoogleEvent,
} from '@/lib/google-calendar'

// Convierte fechas de Google a objetos Date válidos.
// Acepta dateTime (con hora) o date (día completo → 09:00–10:00).
function parseGoogleDates(gEv: GoogleEvent): { start: Date; end: Date } | null {
  try {
    let startStr = gEv.start?.dateTime
    let endStr = gEv.end?.dateTime

    if (!startStr && gEv.start?.date) startStr = `${gEv.start.date}T09:00:00`
    if (!endStr && gEv.end?.date) {
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
  let readOnly = 0
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
          // Fue eliminado en Google → recrear solo si es evento PHM propio
          if (ev.source === 'PHM') {
            const created = await createGoogleEvent(accessToken, payload)
            await prisma.calendarEvent.update({
              where: { id: ev.id },
              data: { googleEventId: created.id, syncStatus: 'SYNCED' },
            })
          } else {
            // Evento externo eliminado en Google → marcar cancelado en PHM
            await prisma.calendarEvent.update({
              where: { id: ev.id },
              data: { status: 'CANCELADO', syncStatus: 'SYNCED' },
            })
            cancelled++
            continue
          }
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
      if (isReadOnlyError(msg)) {
        // Evento de solo lectura (vuelo, reserva, etc.) → ignorar sin error
        readOnly++
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { syncStatus: 'SYNCED' },
        }).catch(() => {})
      } else {
        console.error(`PHM→Google "${ev.title}":`, msg)
        errorDetails.push(`"${ev.title}": ${msg}`)
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { syncStatus: 'ERROR' },
        }).catch(() => {})
      }
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
      readOnly,
      errors: errorDetails.length + 1,
      errorDetails: [...errorDetails, `Google Calendar: ${msg}`],
    })
  }

  const phmByGoogleId = await prisma.calendarEvent.findMany({
    where: { googleEventId: { not: null } },
    select: { id: true, googleEventId: true, updatedAt: true },
  })
  const phmGoogleMap = new Map(phmByGoogleId.map(e => [e.googleEventId!, e]))

  for (const gEv of googleEvents) {
    // Verificar cancelados primero (pueden no tener fechas)
    if (gEv.status === 'cancelled') {
      const existing = phmGoogleMap.get(gEv.id)
      if (existing) {
        try {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: { status: 'CANCELADO', syncStatus: 'SYNCED' },
          })
          cancelled++
        } catch { /* ignorar */ }
      }
      continue
    }

    const dates = parseGoogleDates(gEv)
    if (!dates) continue

    const existing = phmGoogleMap.get(gEv.id)
    const externalEvent = isReadOnlyGoogleEvent(gEv)

    if (existing) {
      // Actualizar en PHM si Google es más reciente
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
          errorDetails.push(`"${gEv.summary || gEv.id}": ${msg}`)
        }
      }
    } else {
      // Evento nuevo desde Google → importar para visualización
      try {
        const notesValue = externalEvent
          ? [gEv.description?.trim(), '(Evento externo — solo lectura)'].filter(Boolean).join('\n')
          : gEv.description?.trim() || null

        await prisma.calendarEvent.create({
          data: {
            title: gEv.summary?.trim() || 'Sin título',
            type: 'OTRO',
            startDateTime: dates.start,
            endDateTime: dates.end,
            location: gEv.location?.trim() || null,
            notes: notesValue,
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
        errorDetails.push(`"${gEv.summary || gEv.id}": ${msg}`)
      }
    }
  }

  const total = phmToGoogle + googleToPHM + cancelled
  return NextResponse.json({
    synced: total,
    phmToGoogle,
    googleToPHM,
    cancelled,
    readOnly,
    errors: errorDetails.length,
    errorDetails,
  })
}
