import { prisma } from './prisma'

type ContentType =
  | 'REEL'
  | 'VIDEO_HORIZONTAL'
  | 'FOTO'
  | 'IMAGEN_FLYER'
  | 'CAROUSEL'
  | 'FLYER'
  | 'VIDEO'
  | 'EXTRA'
  | 'OTRO'

type ContentFormat = 'VERTICAL_9_16' | 'HORIZONTAL_16_9' | 'CUADRADO_1_1' | 'NO_APLICA'

interface ContentTemplate {
  type: ContentType
  formato: ContentFormat | null
  count: number
  label: string
}

function nextPeriod(month: number, year: number) {
  return month === 12
    ? { month: 1, year: year + 1 }
    : { month: month + 1, year }
}

function templatesFromServicePlan(servicePlan: any): ContentTemplate[] {
  const templates: ContentTemplate[] = []
  if (servicePlan.cantidadReels > 0) {
    templates.push({ type: 'REEL', formato: 'VERTICAL_9_16', count: servicePlan.cantidadReels, label: 'Reel' })
  }
  if (servicePlan.cantidadVideosHorizontales > 0) {
    templates.push({ type: 'VIDEO_HORIZONTAL', formato: 'HORIZONTAL_16_9', count: servicePlan.cantidadVideosHorizontales, label: 'Video Horizontal' })
  }
  if (servicePlan.cantidadFotos > 0) {
    templates.push({ type: 'FOTO', formato: 'CUADRADO_1_1', count: servicePlan.cantidadFotos, label: 'Foto' })
  }
  if (servicePlan.cantidadImagenesFlyers > 0) {
    templates.push({ type: 'IMAGEN_FLYER', formato: 'NO_APLICA', count: servicePlan.cantidadImagenesFlyers, label: 'Imagen/Flyer' })
  }
  return templates
}

function templatesFromContents(contents: any[]): ContentTemplate[] {
  const grouped = new Map<string, ContentTemplate>()
  for (const content of contents) {
    const key = `${content.type}:${content.formato ?? 'NO_APLICA'}`
    const current = grouped.get(key)
    if (current) {
      current.count += 1
      continue
    }
    const labelMap: Record<string, string> = {
      REEL: 'Reel',
      VIDEO_HORIZONTAL: 'Video Horizontal',
      FOTO: 'Foto',
      IMAGEN_FLYER: 'Imagen/Flyer',
      CAROUSEL: 'Carrusel',
      FLYER: 'Flyer',
      VIDEO: 'Video',
      EXTRA: 'Extra',
      OTRO: 'Entregable',
    }
    grouped.set(key, {
      type: content.type,
      formato: content.formato ?? null,
      count: 1,
      label: labelMap[content.type] ?? 'Entregable',
    })
  }
  return Array.from(grouped.values())
}

async function createContentsForPlan(
  planId: string,
  clientId: string,
  templates: ContentTemplate[]
): Promise<void> {
  const rows = templates.flatMap(({ type, formato, count, label }) =>
    Array.from({ length: count }, (_, i) => ({
      clientId,
      planId,
      type: type as any,
      formato: formato as any,
      title: `${label} ${i + 1}/${count}`,
      status: 'PENDING' as const,
    }))
  )

  if (rows.length > 0) {
    await prisma.content.createMany({ data: rows })
  }
}

/**
 * Garantiza el periodo del mes actual para un cliente con servicio mensual.
 * Es idempotente: si ya existe el mes/año, no duplica ni reinicia estados.
 */
export async function createOrUpdateMonthlyPlanForClient(
  clientId: string,
  servicePlanId: string | null | undefined
): Promise<string | null> {
  if (!servicePlanId) return null

  const servicePlan = await prisma.servicePlan.findUnique({
    where: { id: servicePlanId },
  })
  if (!servicePlan || servicePlan.modalidad !== 'MENSUAL' || !servicePlan.activo) return null

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const existingPlan = await prisma.monthlyPlan.findUnique({
    where: { clientId_month_year: { clientId, month, year } },
  })

  // Nunca reiniciar un ciclo existente. El histórico del mes debe ser inmutable
  // salvo cambios explícitos hechos desde su pantalla de edición.
  if (existingPlan) return existingPlan.id

  const templates = templatesFromServicePlan(servicePlan)
  const plan = await prisma.monthlyPlan.create({
    data: {
      clientId,
      servicePlanId,
      month,
      year,
      reelsCount: servicePlan.cantidadReels,
      carouselsCount: 0,
      flyersCount: servicePlan.cantidadImagenesFlyers,
      monthlyPrice: servicePlan.precio,
      precioBase: servicePlan.precio,
      precioFinal: servicePlan.precio,
      paymentStatus: 'PENDING',
      planStatus: 'IN_PROGRESS',
    },
  })

  await createContentsForPlan(plan.id, clientId, templates)
  return plan.id
}

/**
 * Genera el mes siguiente tomando como plantilla el periodo actual.
 * Copia la configuración y los entregables, pero NO copia estados, links ni pagos.
 */
export async function renewMonthlyPlan(planId: string): Promise<{ id: string; created: boolean }> {
  const source = await prisma.monthlyPlan.findUnique({
    where: { id: planId },
    include: { contents: { orderBy: { createdAt: 'asc' } } },
  })
  if (!source) throw new Error('PLAN_NOT_FOUND')

  const { month, year } = nextPeriod(source.month, source.year)

  const existing = await prisma.monthlyPlan.findUnique({
    where: { clientId_month_year: { clientId: source.clientId, month, year } },
  })
  if (existing) return { id: existing.id, created: false }

  const templates = source.contents.length > 0
    ? templatesFromContents(source.contents)
    : [
        ...(source.reelsCount > 0 ? [{ type: 'REEL' as ContentType, formato: 'VERTICAL_9_16' as ContentFormat, count: source.reelsCount, label: 'Reel' }] : []),
        ...(source.carouselsCount > 0 ? [{ type: 'CAROUSEL' as ContentType, formato: 'CUADRADO_1_1' as ContentFormat, count: source.carouselsCount, label: 'Carrusel' }] : []),
        ...(source.flyersCount > 0 ? [{ type: 'FLYER' as ContentType, formato: 'NO_APLICA' as ContentFormat, count: source.flyersCount, label: 'Flyer' }] : []),
      ]

  const plan = await prisma.monthlyPlan.create({
    data: {
      clientId: source.clientId,
      servicePlanId: source.servicePlanId,
      month,
      year,
      reelsCount: source.reelsCount,
      carouselsCount: source.carouselsCount,
      flyersCount: source.flyersCount,
      monthlyPrice: source.monthlyPrice,
      precioBase: source.precioBase,
      precioFinal: source.precioFinal ?? source.monthlyPrice,
      paymentStatus: 'PENDING',
      planStatus: 'IN_PROGRESS',
      observations: source.observations,
    },
  })

  await createContentsForPlan(plan.id, source.clientId, templates)
  return { id: plan.id, created: true }
}

/**
 * Crea, al abrir Planes/Dashboard, el periodo del mes actual de todos los
 * clientes activos que tengan un servicio mensual activo asignado.
 */
export async function ensureCurrentMonthlyPlans(): Promise<void> {
  const clients = await prisma.client.findMany({
    where: {
      status: 'ACTIVE',
      servicePlanId: { not: null },
      servicePlan: { modalidad: 'MENSUAL', activo: true },
    },
    select: { id: true, servicePlanId: true },
  })

  await Promise.all(
    clients.map((client) => createOrUpdateMonthlyPlanForClient(client.id, client.servicePlanId))
  )
}
