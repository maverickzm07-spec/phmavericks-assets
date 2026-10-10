import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
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

/**
 * Sincronización bidireccional con Google Calendar.
 *
 * El orden importa. Antes se enviaba TODO lo de PHM a Google y después se leía
 * Google: cada envío refrescaba `updatedAt`, así que al comparar fechas PHM
 * siempre parecía más reciente y los cambios hechos en Google no volvían nunca.
 *
 * Ahora se lee Google primero y cada lado solo se envía si cambió realmente
 * desde la última sincronización (`lastSyncedAt`). Cuando ambos cambiaron, gana
 * el más reciente: nunca se pisa una edición nueva con información vieja.
 */

/** Convierte fechas de Google. Acepta dateTime, o date de día completo (09:00–10:00). */
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

/** Un evento cambió en PHM si se editó después de la última sincronización. */
function cambioEnPHM(ev: { updatedAt: Date; lastSyncedAt: Date | null }): boolean {
  if (!ev.lastSyncedAt) return true
  // Medio segundo de margen: la propia escritura de la sync mueve updatedAt.
  return ev.updatedAt.getTime() > ev.lastSyncedAt.getTime() + 500
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

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
  let sinCambios = 0
  const errorDetails: string[] = []

  // ── 1. Leer Google ───────────────────────────────────────────
  // Se hace primero para conocer el estado remoto antes de enviar nada.
  let googleEvents: GoogleEvent[]
  try {
    googleEvents = await listGoogleEvents(accessToken, timeMin, timeMax)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Error listando Google Calendar:', msg)
    return NextResponse.json({
      synced: 0, phmToGoogle: 0, googleToPHM: 0, cancelled: 0, readOnly: 0,
      errors: 1, errorDetails: [`Google Calendar: ${msg}`],
    }, { status: 502 })
  }

  const googlePorId = new Map(googleEvents.map((g) => [g.id, g]))

  const eventosPHM = await prisma.calendarEvent.findMany({
    where: { status: { not: 'CANCELADO' } },
  })

  // ── 2. Google → PHM ──────────────────────────────────────────
  for (const ev of eventosPHM) {
    if (!ev.googleEventId) continue
    const gEv = googlePorId.get(ev.googleEventId)
    if (!gEv) continue

    if (gEv.status === 'cancelled') {
      await prisma.calendarEvent.update({
        where: { id: ev.id },
        data: { status: 'CANCELADO', syncStatus: 'SYNCED', lastSyncedAt: new Date() },
      }).catch(() => {})
      cancelled++
      continue
    }

    const dates = parseGoogleDates(gEv)
    if (!dates) continue

    const googleUpdated = gEv.updated ? new Date(gEv.updated) : null
    const referencia = ev.lastSyncedAt ?? new Date(0)
    const cambioEnGoogle = googleUpdated ? googleUpdated > referencia : false

    // Si cambiaron los dos lados, se queda el más reciente.
    if (cambioEnGoogle && cambioEnPHM(ev) && googleUpdated && googleUpdated <= ev.updatedAt) {
      continue // PHM es más nuevo: se resolverá en el paso 3
    }

    if (cambioEnGoogle) {
      try {
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: {
            title: gEv.summary?.trim() || 'Sin título',
            startDateTime: dates.start,
            endDateTime: dates.end,
            location: gEv.location?.trim() || null,
            notes: gEv.description?.trim() || null,
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date(),
          },
        })
        googleToPHM++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errorDetails.push(`"${gEv.summary || gEv.id}": ${msg}`)
      }
    }
  }

  // ── 3. PHM → Google ──────────────────────────────────────────
  // Solo lo que cambió en PHM, o lo que todavía no existe en Google.
  const paraEnviar = await prisma.calendarEvent.findMany({
    where: { status: { not: 'CANCELADO' } },
  })

  for (const ev of paraEnviar) {
    const existeEnGoogle = ev.googleEventId ? googlePorId.has(ev.googleEventId) : false

    // Un evento importado de Google que no cambió en PHM no se reenvía:
    // hacerlo lo marcaría como modificado y provocaría un ciclo.
    if (ev.googleEventId && existeEnGoogle && !cambioEnPHM(ev)) {
      sinCambios++
      continue
    }

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
          // Desapareció en Google: se recrea si es un evento propio de PHM;
          // si venía de Google, se da por cancelado.
          if (ev.source === 'PHM') {
            const created = await createGoogleEvent(accessToken, payload)
            await prisma.calendarEvent.update({
              where: { id: ev.id },
              data: { googleEventId: created.id, syncStatus: 'SYNCED', lastSyncedAt: new Date() },
            })
          } else {
            await prisma.calendarEvent.update({
              where: { id: ev.id },
              data: { status: 'CANCELADO', syncStatus: 'SYNCED', lastSyncedAt: new Date() },
            })
            cancelled++
            continue
          }
        } else {
          await prisma.calendarEvent.update({
            where: { id: ev.id },
            data: { syncStatus: 'SYNCED', lastSyncedAt: new Date() },
          })
        }
      } else {
        const created = await createGoogleEvent(accessToken, payload)
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { googleEventId: created.id, syncStatus: 'SYNCED', lastSyncedAt: new Date() },
        })
      }
      phmToGoogle++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isReadOnlyError(msg)) {
        // Evento ajeno (un vuelo, una reserva): Google no deja editarlo.
        readOnly++
        await prisma.calendarEvent.update({
          where: { id: ev.id },
          data: { syncStatus: 'SYNCED', lastSyncedAt: new Date() },
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
    // Respiro entre llamadas para no topar el límite de tasa de Google.
    await new Promise((r) => setTimeout(r, 120))
  }

  // ── 4. Eventos nuevos que solo existen en Google ─────────────
  const idsConocidos = new Set(
    (await prisma.calendarEvent.findMany({
      where: { googleEventId: { not: null } },
      select: { googleEventId: true },
    })).map((e) => e.googleEventId!),
  )

  for (const gEv of googleEvents) {
    if (idsConocidos.has(gEv.id) || gEv.status === 'cancelled') continue

    const dates = parseGoogleDates(gEv)
    if (!dates) continue

    const externo = isReadOnlyGoogleEvent(gEv)
    try {
      await prisma.calendarEvent.create({
        data: {
          title: gEv.summary?.trim() || 'Sin título',
          type: 'OTRO',
          startDateTime: dates.start,
          endDateTime: dates.end,
          location: gEv.location?.trim() || null,
          notes: externo
            ? [gEv.description?.trim(), '(Evento externo — solo lectura)'].filter(Boolean).join('\n')
            : gEv.description?.trim() || null,
          status: 'AGENDADO',
          source: 'GOOGLE',
          googleEventId: gEv.id,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      })
      googleToPHM++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errorDetails.push(`"${gEv.summary || gEv.id}": ${msg}`)
    }
  }

  return NextResponse.json({
    synced: phmToGoogle + googleToPHM,
    phmToGoogle,
    googleToPHM,
    cancelled,
    readOnly,
    sinCambios,
    errors: errorDetails.length,
    errorDetails,
  })
}
