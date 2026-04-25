import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  // Retorna el payload directamente (sin anidado) para que Sidebar lo use fácil
  return NextResponse.json({
    id: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
  })
}
