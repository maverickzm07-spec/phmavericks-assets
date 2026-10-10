import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents } from '@/lib/permissions'
import { enviarEntregaPorCorreo } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  accessId: z.string().min(1),
  /** Permite enviar a otra dirección distinta de la del cliente. */
  destinatario: z.string().email('Correo electrónico inválido').optional(),
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

    const destinatario = data.destinatario || access.client?.email
    if (!destinatario) {
      return NextResponse.json(
        { error: 'El cliente no tiene correo registrado. Agrégalo en su ficha o indica una dirección.' },
        { status: 400 },
      )
    }

    const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://app.phmavericks.com'
    const url = access.publicSlug ? `${base}/e/${access.publicSlug}` : `${base}/entrega/${access.token}`

    const nombreTrabajo = access.project?.nombre
      ?? (access.monthlyPlan ? `Plan ${access.monthlyPlan.month}/${access.monthlyPlan.year}` : 'tu entrega')

    const resultado = await enviarEntregaPorCorreo({
      destinatario,
      nombreCliente: access.client?.name ?? '',
      nombreTrabajo,
      url,
    })

    return NextResponse.json({
      success: true,
      destinatario,
      mensaje: resultado.enviado
        ? `Entrega enviada a ${destinatario}`
        : 'SMTP no configurado: el correo se registró en la consola del servidor, no se envió.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/delivery-access/enviar]', error)
    return NextResponse.json({ error: 'No se pudo enviar el correo' }, { status: 500 })
  }
}
