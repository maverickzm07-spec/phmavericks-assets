import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { sendVerificationCode } from '@/lib/email'
import { canManageUsers } from '@/lib/permissions'
import { rateLimit } from '@/lib/rateLimit'
import { randomInt } from 'crypto'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
})

function generateCode(): string {
  // Código de 6 dígitos criptográficamente seguro
  return randomInt(100000, 1000000).toString()
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageUsers(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const { email, name } = schema.parse(body)

    // Límite anti-spam de correos: 5 códigos por email destino cada 10 minutos
    const rl = rateLimit(`send-code:${email.toLowerCase()}`, 5, 10 * 60 * 1000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Demasiados envíos a este correo. Espera ${Math.ceil(rl.retryAfter / 60)} minuto(s).` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Este correo ya tiene una cuenta registrada' }, { status: 409 })
    }

    await prisma.verificationCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.verificationCode.create({
      data: { email, code, expiresAt },
    })

    const result = await sendVerificationCode(email, code, name)

    return NextResponse.json({
      success: true,
      devMode: result.devMode ?? false,
      message: result.devMode
        ? 'Código generado. Revisa la consola del servidor (modo desarrollo sin SMTP).'
        : `Código enviado a ${email}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Error enviando código:', error)
    return NextResponse.json({ error: 'No se pudo enviar el correo. Verifica la configuración SMTP.' }, { status: 500 })
  }
}
