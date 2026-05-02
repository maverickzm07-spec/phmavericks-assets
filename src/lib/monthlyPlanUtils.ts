import { prisma } from './prisma'

interface ContentTemplate {
  type: 'REEL' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER'
  formato: 'VERTICAL_9_16' | 'HORIZONTAL_16_9' | 'CUADRADO_1_1' | 'NO_APLICA'
  count: number
  label: string
}

export async function createOrUpdateMonthlyPlanForClient(
  clientId: string,
  servicePlanId: string | null | undefined
): Promise<void> {
  if (!servicePlanId) return

  const servicePlan = await prisma.servicePlan.findUnique({
    where: { id: servicePlanId },
  })
  if (!servicePlan) return
  if (servicePlan.modalidad !== 'MENSUAL') return
  if (!servicePlan.activo) return

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

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

  const existingPlan = await prisma.monthlyPlan.findFirst({
    where: { clientId, month, year },
  })

  if (existingPlan) {
    if (existingPlan.servicePlanId === servicePlanId) return

    // Plan distinto para el mismo mes → actualizar y regenerar contenidos pendientes
    await prisma.content.deleteMany({
      where: { planId: existingPlan.id, status: 'PENDING' },
    })

    await prisma.monthlyPlan.update({
      where: { id: existingPlan.id },
      data: {
        servicePlanId,
        reelsCount: servicePlan.cantidadReels,
        carouselsCount: 0,
        flyersCount: servicePlan.cantidadImagenesFlyers,
        monthlyPrice: servicePlan.precio,
        planStatus: 'IN_PROGRESS',
      },
    })

    await createContentsForPlan(existingPlan.id, clientId, templates)
    return
  }

  // Crear Plan Mensual nuevo
  const newPlan = await prisma.monthlyPlan.create({
    data: {
      clientId,
      servicePlanId,
      month,
      year,
      reelsCount: servicePlan.cantidadReels,
      carouselsCount: 0,
      flyersCount: servicePlan.cantidadImagenesFlyers,
      monthlyPrice: servicePlan.precio,
      paymentStatus: 'PENDING',
      planStatus: 'IN_PROGRESS',
    },
  })

  await createContentsForPlan(newPlan.id, clientId, templates)
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
      type,
      formato,
      title: `${label} ${i + 1}/${count}`,
      status: 'PENDING' as const,
    }))
  )

  if (rows.length > 0) {
    await prisma.content.createMany({ data: rows })
  }
}
