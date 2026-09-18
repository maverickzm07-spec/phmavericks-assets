import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteMonthlyPlans } from '@/lib/permissions'
import { renewMonthlyPlan } from '@/lib/monthlyPlanUtils'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteMonthlyPlans(user.role)) {
    return NextResponse.json({ error: 'Sin permisos para renovar planes' }, { status: 403 })
  }

  try {
    const result = await renewMonthlyPlan(params.id)
    return NextResponse.json({
      success: true,
      planId: result.id,
      created: result.created,
      message: result.created ? 'Próximo mes generado correctamente' : 'El próximo mes ya existía',
    }, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof Error && error.message === 'PLAN_NOT_FOUND') {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }
    console.error('[POST /api/planes/:id/renovar]', error)
    return NextResponse.json({ error: 'No se pudo generar el próximo mes' }, { status: 500 })
  }
}
