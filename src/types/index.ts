export type ClientStatus = 'ACTIVE' | 'PAUSED' | 'FINISHED'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'
export type PlanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'
export type ContentType = 'REEL' | 'CAROUSEL' | 'FLYER' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER' | 'EXTRA' | 'VIDEO' | 'OTRO'
export type ContentFormat = 'VERTICAL_9_16' | 'HORIZONTAL_16_9' | 'CUADRADO_1_1' | 'NO_APLICA'
export type ContentStatus = 'PENDING' | 'EDITING' | 'APPROVED' | 'PUBLISHED' | 'COMPLETED' | 'PENDIENTE' | 'EN_PROCESO' | 'EN_EDICION' | 'ENTREGADO' | 'PUBLICADO'
export type Modalidad = 'MENSUAL' | 'OCASIONAL'
export type ProjectStatus = 'PENDIENTE' | 'EN_PROCESO' | 'EN_EDICION' | 'APROBADO' | 'ENTREGADO' | 'COMPLETADO' | 'ATRASADO'
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VENTAS' | 'PRODUCCION' | 'SOLO_LECTURA'

export interface Client {
  id: string
  name: string
  business: string
  contact: string | null
  whatsapp: string | null
  email: string | null
  status: ClientStatus
  notes: string | null
  servicePlanId: string | null
  createdAt: string
  updatedAt: string
  _count?: { monthlyPlans: number; contents: number; projects: number }
}

export interface ServicePlan {
  id: string
  nombre: string
  tipo: 'CONTENIDO' | 'IA' | 'FOTOGRAFIA' | 'PERSONALIZADO'
  modalidad: Modalidad
  precio: number
  cantidadReels: number
  cantidadVideosHorizontales: number
  cantidadFotos: number
  cantidadImagenesFlyers: number
  jornadasGrabacion: number
  duracion: string | null
  vestuarios: number
  descripcion: string | null
  caracteristicas: string[]
  esDefault: boolean
  activo: boolean
  _count?: { clients: number }
}

export interface MonthlyPlan {
  id: string
  clientId: string
  client?: Client
  month: number
  year: number
  reelsCount: number
  carouselsCount: number
  flyersCount: number
  monthlyPrice: number
  paymentStatus: PaymentStatus
  planStatus: PlanStatus
  observations: string | null
  createdAt: string
  updatedAt: string
  contents?: Content[]
  _count?: { contents: number }
}

export interface Content {
  id: string
  clientId: string
  client?: { id: string; name: string }
  planId: string | null
  plan?: { id: string; month: number; year: number } | null
  projectId: string | null
  project?: { id: string; nombre: string; modalidad: Modalidad } | null
  type: ContentType
  formato: ContentFormat | null
  title: string
  status: ContentStatus
  driveLink: string | null
  publishedLink: string | null
  publishedAt: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  observations: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientProject {
  id: string
  clientId: string
  client?: { id: string; name: string; business: string }
  serviceId: string | null
  service?: { id: string; nombre: string; tipo: string; modalidad: Modalidad } | null
  monthlyPlanId: string | null
  monthlyPlan?: { id: string; month: number; year: number } | null
  nombre: string
  modalidad: Modalidad
  estado: ProjectStatus
  linkEntrega: string | null
  fechaEntrega: string | null
  observaciones: string | null
  createdAt: string
  updatedAt: string
  contents?: Content[]
  _count?: { contents: number }
}

export interface DashboardStats {
  activeClients: number
  pendingContents: number
  completedContents: number
  completedPlans: number
  delayedPlans: number
  avgCompliance: number
  recentPlans: MonthlyPlan[]
}
