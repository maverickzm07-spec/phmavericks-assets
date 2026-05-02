import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteMonthlyPlans } from '@/lib/permissions'
import { createOrUpdateMonthlyPlanForClient } from '@/lib/monthlyPlanUtils'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteMonthlyPlans(user.role)) return NextResponse.json({ error: 'Sin permisos para asignar servicios' }, { status: 403 })

  try {
    const body = await request.json()
    const { clientId } = schema.parse(body)

    const service = await prisma.servicePlan.findUnique({ where: { id: params.id } })
    if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    if (!service.activo) return NextResponse.json({ error: 'No se puede asignar un servicio inactivo' }, { status: 400 })
    if (service.modalidad !== 'MENSUAL') {
      return NextResponse.json({ error: 'Este endpoint es para servicios mensuales. Los servicios ocasionales crean proyectos.' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Registrar el servicio en el cliente (solo referencia, sin disparar lógica adicional)
    await prisma.client.update({
      where: { id: clientId },
      data: { servicePlanId: params.id },
    })

    // Crear o actualizar el Plan Mensual con sus contenidos automáticos
    await createOrUpdateMonthlyPlanForClient(clientId, params.id)

    const now = new Date()
    const plan = await prisma.monthlyPlan.findFirst({
      where: { clientId, servicePlanId: params.id, month: now.getMonth() + 1, year: now.getFullYear() },
      include: {
        client: { select: { id: true, name: true, business: true } },
        _count: { select: { contents: true } },
      },
    })

    return NextResponse.json({ success: true, plan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/servicios/[id]/asignar]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
