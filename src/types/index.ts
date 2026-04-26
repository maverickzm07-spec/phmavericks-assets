export type ClientStatus = 'ACTIVE' | 'PAUSED' | 'FINISHED'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'
export type PlanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'
export type ContentType = 'REEL' | 'VIDEO_HORIZONTAL' | 'FOTO' | 'IMAGEN_FLYER' | 'EXTRA'
export type ContentStatus = 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADO' | 'PUBLICADO'
export type SyncStatus = 'MANUAL' | 'PENDIENTE' | 'ACTUALIZADO' | 'ERROR'
export type UserRole = 'ADMIN' | 'EDITOR'

export interface Client {
  id: string
  name: string
  business: string
  contact: string | null
  whatsapp: string | null
  email: string | null
  status: ClientStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    monthlyPlans: number
    contents: number
  }
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
  _count?: {
    contents: number
  }
}

export interface Content {
  id: string
  clientId: string
  client?: Client
  planId: string | null
  plan?: MonthlyPlan
  type: ContentType
  title: string
  status: ContentStatus
  requierePublicacion: boolean
  driveLink: string | null
  publishedLink: string | null
  publishedAt: string | null
  fechaEntrega: string | null
  fechaPublicacion: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  observations: string | null
  ultimaActualizacionMetricas: string | null
  fuenteMetricas: string | null
  estadoSincronizacion: SyncStatus
  errorSincronizacion: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  activeClients: number
  pendingContents: number
  inProccessContents: number
  deliveredContents: number
  publishedContents: number
  completedPlans: number
  delayedPlans: number
  avgCompliance: number
  recentPlans: MonthlyPlan[]
}
