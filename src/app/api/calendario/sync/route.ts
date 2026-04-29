import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import {
  getValidAccessToken,
  createGoogleEvent,
  updateGoogleEvent,
  listGoogleEvents,
  buildDescription,
} from '@/lib/google-calendar'

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
  let errors = 0

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
          // Eliminado en Google → recrear
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
      console.error(`Error PHM→Google evento ${ev.id}:`, err)
      await prisma.calendarEvent.update({ where: { id: ev.id }, data: { syncStatus: 'ERROR' } })
      errors++
    }
  }

  // ── 2. Google → PHM ──────────────────────────────────────────
  let googleEvents
  try {
    googleEvents = await listGoogleEvents(accessToken, timeMin, timeMax)
  } catch (err) {
    console.error('Error listando eventos de Google:', err)
    return NextResponse.json({ phmToGoogle, googleToPHM, cancelled, errors, error: 'Error al leer Google Calendar' })
  }

  // Mapa googleEventId → evento PHM (actualizado tras el paso anterior)
  const phmByGoogleId = await prisma.calendarEvent.findMany({
    where: { googleEventId: { not: null } },
    select: { id: true, googleEventId: true, updatedAt: true },
  })
  const phmGoogleMap = new Map(phmByGoogleId.map(e => [e.googleEventId!, e]))

  for (const gEv of googleEvents) {
    // Ignorar eventos de día completo (no tienen dateTime)
    if (!gEv.start?.dateTime || !gEv.end?.dateTime) continue

    const existing = phmGoogleMap.get(gEv.id)

    if (gEv.status === 'cancelled') {
      // Evento cancelado en Google → marcar CANCELADO en PHM
      if (existing) {
        try {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: { status: 'CANCELADO', syncStatus: 'SYNCED' },
          })
          cancelled++
        } catch { errors++ }
      }
      continue
    }

    if (existing) {
      // El evento ya existe en PHM → actualizar si Google es más reciente
      const googleUpdated = new Date(gEv.updated)
      if (googleUpdated > existing.updatedAt) {
        try {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: {
              title: gEv.summary || 'Sin título',
              startDateTime: new Date(gEv.start.dateTime),
              endDateTime: new Date(gEv.end.dateTime),
              location: gEv.location || null,
              notes: gEv.description || null,
              syncStatus: 'SYNCED',
            },
          })
          googleToPHM++
        } catch (err) {
          console.error(`Error Google→PHM actualizar ${gEv.id}:`, err)
          errors++
        }
      }
    } else {
      // Evento nuevo en Google → crear en PHM
      try {
        await prisma.calendarEvent.create({
          data: {
            title: gEv.summary || 'Sin título',
            type: 'OTRO',
            startDateTime: new Date(gEv.start.dateTime),
            endDateTime: new Date(gEv.end.dateTime),
            location: gEv.location || null,
            notes: gEv.description || null,
            status: 'AGENDADO',
            source: 'GOOGLE',
            googleEventId: gEv.id,
            syncStatus: 'SYNCED',
          },
        })
        googleToPHM++
      } catch (err) {
        console.error(`Error Google→PHM crear ${gEv.id}:`, err)
        errors++
      }
    }
  }

  const total = phmToGoogle + googleToPHM + cancelled
  return NextResponse.json({ synced: total, phmToGoogle, googleToPHM, cancelled, errors })
}
