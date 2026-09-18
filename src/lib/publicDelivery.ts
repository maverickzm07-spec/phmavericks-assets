// Serialización segura de un DeliveryAccess para los portales públicos.
// NUNCA exponer el registro completo (contiene `token`, `createdById`, IDs internos).
// Aquí se seleccionan solo los campos que el portal necesita y se calculan los
// montos reales (montoPagado / saldoPendiente) a partir de los Ingreso vinculados.

// Include que deben usar los endpoints públicos al consultar el DeliveryAccess.
export const PUBLIC_DELIVERY_INCLUDE = {
  client: { select: { name: true, business: true } },
  monthlyPlan: {
    select: {
      month: true,
      year: true,
      planStatus: true,
      paymentStatus: true,
      monthlyPrice: true,
      precioFinal: true,
      deliveryLink: true,
      ingresos: { select: { montoPagado: true } },
    },
  },
  project: {
    select: {
      nombre: true,
      estado: true,
      linkEntrega: true,
      fechaEntrega: true,
      observaciones: true,
      precioFinal: true,
      ingresos: { select: { montoPagado: true } },
    },
  },
} as const

const round2 = (n: number) => Math.round(n * 100) / 100

function derivarEstadoPago(precioRef: number, pagado: number, legacy: string): 'PENDING' | 'PARTIAL' | 'PAID' | string {
  if (precioRef <= 0) return legacy
  if (pagado <= 0) return 'PENDING'
  if (pagado >= precioRef) return 'PAID'
  return 'PARTIAL'
}

// Recibe el `access` ya consultado con PUBLIC_DELIVERY_INCLUDE y devuelve el
// objeto público saneado. Tipado laxo a propósito: es una capa de serialización.
export function serializePublicDelivery(access: any) {
  let monthlyPlan = null
  if (access.monthlyPlan) {
    const p = access.monthlyPlan
    const precioRef = p.precioFinal ?? p.monthlyPrice ?? 0
    const montoPagado = (p.ingresos ?? []).reduce((s: number, i: any) => s + (i.montoPagado || 0), 0)
    const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - montoPagado) : 0
    monthlyPlan = {
      month: p.month,
      year: p.year,
      planStatus: p.planStatus,
      paymentStatus: derivarEstadoPago(precioRef, montoPagado, p.paymentStatus),
      monthlyPrice: round2(precioRef),
      montoPagado: round2(montoPagado),
      saldoPendiente: round2(saldoPendiente),
      deliveryLink: p.deliveryLink,
    }
  }

  let project = null
  if (access.project) {
    const pr = access.project
    const precioRef = pr.precioFinal ?? 0
    const montoPagado = (pr.ingresos ?? []).reduce((s: number, i: any) => s + (i.montoPagado || 0), 0)
    const saldoPendiente = precioRef > 0 ? Math.max(0, precioRef - montoPagado) : 0
    project = {
      nombre: pr.nombre,
      estado: pr.estado,
      linkEntrega: pr.linkEntrega,
      fechaEntrega: pr.fechaEntrega,
      observaciones: pr.observaciones,
      precioFinal: round2(precioRef),
      montoPagado: round2(montoPagado),
      saldoPendiente: round2(saldoPendiente),
    }
  }

  return {
    isActive: access.isActive,
    client: access.client, // ya viene solo { name, business }
    monthlyPlan,
    project,
  }
}
