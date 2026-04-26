export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function getMonthName(month: number): string {
  return MONTHS[month - 1] || 'Desconocido'
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export interface ComplianceData {
  reelsDelivered: number
  carouselsDelivered: number
  flyersDelivered: number
  totalContracted: number
  totalDelivered: number
  compliancePercentage: number
}

export interface PlanWithCounts {
  reelsCount: number
  carouselsCount: number
  flyersCount: number
}

export interface ContentForCompliance {
  type: string
  status: string
  driveLink: string | null
  publishedLink: string | null
}

export function calculateCompliance(
  plan: PlanWithCounts,
  contents: ContentForCompliance[]
): ComplianceData {
  const delivered = contents.filter(
    (c) =>
      (c.status === 'ENTREGADO' || c.status === 'PUBLICADO') &&
      (c.driveLink || c.publishedLink)
  )

  const reelsDelivered = delivered.filter((c) => c.type === 'REEL').length
  const carouselsDelivered = delivered.filter((c) => c.type === 'FOTO' || c.type === 'VIDEO_HORIZONTAL').length
  const flyersDelivered = delivered.filter((c) => c.type === 'IMAGEN_FLYER').length

  const totalContracted = plan.reelsCount + plan.carouselsCount + plan.flyersCount
  const totalDelivered = reelsDelivered + carouselsDelivered + flyersDelivered

  const compliancePercentage =
    totalContracted > 0 ? Math.round((totalDelivered / totalContracted) * 100) : 0

  return {
    reelsDelivered,
    carouselsDelivered,
    flyersDelivered,
    totalContracted,
    totalDelivered,
    compliancePercentage,
  }
}

export function getStatusLabel(status: string, type: 'client' | 'plan' | 'content' | 'payment'): string {
  const labels: Record<string, Record<string, string>> = {
    client: { ACTIVE: 'Activo', PAUSED: 'Pausado', FINISHED: 'Finalizado' },
    plan: { IN_PROGRESS: 'En Proceso', COMPLETED: 'Completado', DELAYED: 'Atrasado' },
    content: { PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', ENTREGADO: 'Entregado', PUBLICADO: 'Publicado' },
    payment: { PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado' },
  }
  return labels[type]?.[status] || status
}

export function getContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    REEL: 'Reel',
    VIDEO_HORIZONTAL: 'Video horizontal',
    FOTO: 'Foto',
    IMAGEN_FLYER: 'Imagen / Flyer',
    EXTRA: 'Extra',
  }
  return labels[type] || type
}
