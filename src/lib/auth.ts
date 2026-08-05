import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

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

export async function getUser(): Promise<JwtPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('phm_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getUserFromRequest(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get('phm_token')?.value
  if (!token) return null
  return verifyToken(token)
}
