import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const RAW_SECRET = process.env.JWT_SECRET
if (!RAW_SECRET || RAW_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres). ' +
    'Define una cadena aleatoria larga en las variables de entorno antes de arrancar la aplicación.'
  )
}
const SECRET = new TextEncoder().encode(RAW_SECRET)

export interface JwtPayload {
  userId: string
  email: string
  name: string
  role: string
}

export async function createToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

/**
 * Confirma contra la base que el usuario del token sigue existiendo y activo,
 * y devuelve su ROL ACTUAL.
 *
 * El token dura 7 días y lleva el rol dentro. Sin esta comprobación, desactivar
 * a alguien o bajarle el rol no surtía efecto hasta que su sesión caducara:
 * durante una semana seguiría entrando con los permisos de antes.
 */
async function revalidarUsuario(payload: JwtPayload | null): Promise<JwtPayload | null> {
  if (!payload?.userId) return null

  const actual = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, activo: true },
  })

  // Usuario eliminado o dado de baja: la sesión deja de valer de inmediato.
  if (!actual || !actual.activo) return null

  return {
    userId: actual.id,
    email: actual.email,
    name: actual.name,
    role: actual.role,
  }
}

export async function getUser(): Promise<JwtPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('phm_token')?.value
  if (!token) return null
  return revalidarUsuario(await verifyToken(token))
}

export async function getUserFromRequest(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get('phm_token')?.value
  if (!token) return null
  return revalidarUsuario(await verifyToken(token))
}
