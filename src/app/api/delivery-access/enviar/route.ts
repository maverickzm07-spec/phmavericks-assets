import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { enviarEntregaPorCorreo } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  accessId: z.string().min(1),
})

/**
 * Envía al cliente el enlace de su entrega desde el correo corporativo.
 *
 * El correo solo lleva el enlace público: nunca el token interno, ni importes,
 * ni notas de producción.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) {
    return NextResponse.json({ error: 'Sin permisos para enviar entregas' }, { status: 403 })
  }

  try {
    const data = schema.parse(await request.json())

    const access = await prisma.deliveryAccess.findUnique({
      where: { id: data.accessId },
      include: {
        client: { select: { name: true, email: true } },
        project: { select: { nombre: true } },
        monthlyPlan: { select: { month: true, year: true } },
      },
    })
    if (!access) return NextResponse.json({ error: 'Enlace de entrega no encontrado' }, { status: 404 })
    if (!access.isActive) {
      return NextResponse.json({ error: 'El enlace está desactivado. Actívalo antes de enviarlo.' }, { status: 400 })
    }

    // La ficha del cliente es la única fuente del destinatario. Nunca usar
    // el correo del usuario autenticado, SMTP_USER o un destino del navegador.
    const correoCliente = z.string().trim().email().safeParse(access.client?.email)
    if (!correoCliente.success) {
      return NextResponse.json(
        { error: 'El cliente no tiene un correo válido registrado. Corrígelo en su ficha antes de enviar.' },
        { status: 400 },
      )
    }
    const destinatario = correoCliente.data

    const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://app.phmavericks.com'
    const ruta = access.publicSlug ? `/e/${encodeURIComponent(access.publicSlug)}` : `/entrega/${encodeURIComponent(access.token)}`
    const url = new URL(ruta, base).toString()

    const nombreTrabajo = access.project?.nombre
      ?? (access.monthlyPlan ? `Plan ${access.monthlyPlan.month}/${access.monthlyPlan.year}` : 'tu entrega')

    const resultado = await enviarEntregaPorCorreo({
      destinatario,
      nombreCliente: access.client?.name ?? '',
      nombreTrabajo,
      url,
    })

    if (!resultado.enviado) {
      return NextResponse.json(
        { success: false, error: 'El servicio de correo no está configurado. La entrega no se ha enviado.' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      success: true,
      destinatario,
      mensaje: `Entrega enviada a ${destinatario}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/delivery-access/enviar]', error)
    return NextResponse.json({ error: 'No se pudo enviar el correo' }, { status: 500 })
  }
}
