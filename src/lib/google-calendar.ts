import { prisma } from './prisma'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const TIMEZONE = 'America/Mexico_City'

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params.toString()}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Error al obtener token de Google')
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
  }
}

async function doRefresh(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'Error al refrescar token')
  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
  }
}

export async function getValidAccessToken(): Promise<string> {
  const token = await prisma.googleToken.findUnique({ where: { id: 'singleton' } })
  if (!token) throw new Error('Google Calendar no conectado')

  if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await doRefresh(token.refreshToken)
    await prisma.googleToken.update({
      where: { id: 'singleton' },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    })
    return refreshed.accessToken
  }

  return token.accessToken
}

export async function isConnected(): Promise<boolean> {
  const token = await prisma.googleToken.findUnique({ where: { id: 'singleton' } })
  return !!token
}

interface GCalEventPayload {
  title: string
  startDateTime: string
  endDateTime: string
  location?: string | null
  description?: string | null
}

export async function createGoogleEvent(accessToken: string, ev: GCalEventPayload) {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: ev.title,
      ...(ev.location && { location: ev.location }),
      ...(ev.description && { description: ev.description }),
      start: { dateTime: ev.startDateTime, timeZone: TIMEZONE },
      end: { dateTime: ev.endDateTime, timeZone: TIMEZONE },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Error al crear evento en Google')
  return data as { id: string }
}

export async function updateGoogleEvent(accessToken: string, googleEventId: string, ev: GCalEventPayload) {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: ev.title,
      ...(ev.location && { location: ev.location }),
      ...(ev.description && { description: ev.description }),
      start: { dateTime: ev.startDateTime, timeZone: TIMEZONE },
      end: { dateTime: ev.endDateTime, timeZone: TIMEZONE },
    }),
  })
  if (res.status === 404) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Error al actualizar evento en Google')
  return data as { id: string }
}
