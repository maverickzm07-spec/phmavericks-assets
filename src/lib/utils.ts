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

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export function calculateCompliance(
  plan: PlanWithCounts,
  contents: ContentForCompliance[]
): ComplianceData {
  const delivered = contents.filter(
    (c) => DONE_STATUSES.includes(c.status) && (c.driveLink || c.publishedLink)
  )

  const reelsDelivered = delivered.filter((c) => ['REEL', 'VIDEO', 'VIDEO_HORIZONTAL'].includes(c.type)).length
  const carouselsDelivered = delivered.filter((c) => c.type === 'CAROUSEL').length
  const flyersDelivered = delivered.filter((c) => ['FLYER', 'IMAGEN_FLYER'].includes(c.type)).length

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

export function getStatusLabel(status: string, type: 'client' | 'plan' | 'content' | 'payment' | 'project'): string {
  const labels: Record<string, Record<string, string>> = {
    client:  { ACTIVE: 'Activo', PAUSED: 'Pausado', FINISHED: 'Finalizado' },
    plan:    { IN_PROGRESS: 'En Proceso', COMPLETED: 'Completado', DELAYED: 'Atrasado' },
    content: {
      PENDING: 'Pendiente', EDITING: 'En Edición', APPROVED: 'Aprobado',
      PUBLISHED: 'Publicado', COMPLETED: 'Completado',
      PENDIENTE: 'Pendiente', EN_PROCESO: 'En Proceso', EN_EDICION: 'En Edición',
      ENTREGADO: 'Entregado', PUBLICADO: 'Publicado',
    },
    payment: { PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado' },
    project: {
      PENDIENTE: 'Pendiente', EN_PROCESO: 'En Proceso', EN_EDICION: 'En Edición',
      APROBADO: 'Aprobado', ENTREGADO: 'Entregado', COMPLETADO: 'Completado', ATRASADO: 'Atrasado',
    },
  }
  return labels[type]?.[status] || status
}

export function getContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    REEL: 'Reel', CAROUSEL: 'Carrusel', FLYER: 'Flyer',
    VIDEO_HORIZONTAL: 'Video Horizontal', FOTO: 'Foto',
    IMAGEN_FLYER: 'Imagen/Flyer', EXTRA: 'Extra',
    VIDEO: 'Video', OTRO: 'Otro',
  }
  return labels[type] || type
}

export function getFormatoLabel(formato: string | null | undefined): string {
  if (!formato) return '—'
  const labels: Record<string, string> = {
    VERTICAL_9_16: 'Vertical 9:16',
    HORIZONTAL_16_9: 'Horizontal 16:9',
    CUADRADO_1_1: 'Cuadrado 1:1',
    NO_APLICA: 'No aplica',
  }
  return labels[formato] || formato
}

export function getModalidadLabel(modalidad: string): string {
  return modalidad === 'MENSUAL' ? 'Mensual' : 'Ocasional'
}

export function getProjectStatusColor(estado: string): string {
  const colors: Record<string, string> = {
    PENDIENTE: 'bg-zinc-800 text-zinc-400',
    EN_PROCESO: 'bg-blue-950 text-blue-400',
    EN_EDICION: 'bg-purple-950 text-purple-400',
    APROBADO: 'bg-amber-950 text-amber-400',
    ENTREGADO: 'bg-teal-950 text-teal-400',
    COMPLETADO: 'bg-green-950 text-green-400',
    ATRASADO: 'bg-red-950 text-red-400',
  }
  return colors[estado] || 'bg-zinc-800 text-zinc-400'
}

export function getContentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-zinc-800 text-zinc-400',
    PENDIENTE: 'bg-zinc-800 text-zinc-400',
    EDITING: 'bg-blue-950 text-blue-400',
    EN_PROCESO: 'bg-blue-950 text-blue-400',
    EN_EDICION: 'bg-purple-950 text-purple-400',
    APPROVED: 'bg-amber-950 text-amber-400',
    APROBADO: 'bg-amber-950 text-amber-400',
    PUBLISHED: 'bg-green-950 text-green-400',
    PUBLICADO: 'bg-green-950 text-green-400',
    ENTREGADO: 'bg-teal-950 text-teal-400',
    COMPLETED: 'bg-zinc-700 text-zinc-300',
    COMPLETADO: 'bg-zinc-700 text-zinc-300',
  }
  return colors[status] || 'bg-zinc-800 text-zinc-400'
}
