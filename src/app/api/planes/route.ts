import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials, stripFinancialFields } from '@/lib/permissions'


export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // La renovación mensual automática se retiró junto con el módulo de Planes
  // Mensuales: seguía creando ciclos nuevos de un módulo que ya no se opera.
  // El endpoint se conserva en solo lectura para el histórico financiero y para
  // los enlaces públicos de entrega que aún apuntan a planes antiguos.

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const planStatus = searchParams.get('planStatus')

  const plans = await prisma.monthlyPlan.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(month && { month: parseInt(month) }),
      ...(year && { year: parseInt(year) }),
      ...(planStatus && { planStatus: planStatus as 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' }),
    },
    include: {
      client: true,
      contents: true,
      ingresos: { select: { id: true, monto: true, montoPagado: true, estadoPago: true, metodoPago: true, fechaIngreso: true } },
      _count: { select: { contents: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  const showFinancials = canViewFinancials(user.role)

  const plansConCalc = plans.map(p => {
    const totalPagado = p.ingresos.reduce((s, i) => s + i.montoPagado, 0)
    const precioRef = p.precioFinal ?? p.monthlyPrice
    const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - totalPagado) : null
    const estadoEconomico = precioRef <= 0 ? 'SIN_PRECIO'
      : totalPagado <= 0 ? 'SIN_PAGO'
      : totalPagado >= precioRef ? 'PAGADO'
      : 'ABONADO'
    const enriched = { ...p, totalPagado, saldoPendiente, estadoEconomico }
    return showFinancials ? enriched : stripFinancialFields(enriched)
  })

  return NextResponse.json(plansConCalc)
}

// La creación de planes mensuales se retiró: el módulo ya no se opera y ningún
// trabajo nuevo debe colgar de un plan. Este endpoint queda en solo lectura para
// el histórico financiero y los enlaces públicos de entrega ya emitidos.
