export type ClientStatus = 'ACTIVE' | 'PAUSED' | 'FINISHED'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'
export type PlanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'
export type ContentType = 'REEL' | 'CAROUSEL' | 'FLYER'
export type ContentStatus = 'PENDING' | 'EDITING' | 'APPROVED' | 'PUBLISHED' | 'COMPLETED'
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
  planId: string
  plan?: MonthlyPlan
  type: ContentType
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

export interface DashboardStats {
  activeClients: number
  pendingContents: number
  completedContents: number
  completedPlans: number
  delayedPlans: number
  avgCompliance: number
  recentPlans: MonthlyPlan[]
}
