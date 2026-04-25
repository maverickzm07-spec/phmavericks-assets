interface BadgeProps {
  variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const variants = {
  green: 'bg-green-950 text-green-400 border border-green-800',
  yellow: 'bg-yellow-950 text-yellow-400 border border-yellow-800',
  red: 'bg-red-950 text-red-400 border border-red-800',
  blue: 'bg-blue-950 text-blue-400 border border-blue-800',
  gray: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  purple: 'bg-purple-950 text-purple-400 border border-purple-800',
  orange: 'bg-orange-950 text-orange-400 border border-orange-800',
}

export default function Badge({ variant, children, size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${sizeClass} ${variants[variant]}`}>
      {children}
    </span>
  )
}

export function clientStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    ACTIVE: { variant: 'green', label: 'Activo' },
    PAUSED: { variant: 'yellow', label: 'Pausado' },
    FINISHED: { variant: 'gray', label: 'Finalizado' },
  }
  const { variant, label } = map[status] || { variant: 'gray', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

export function planStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    IN_PROGRESS: { variant: 'blue', label: 'En Proceso' },
    COMPLETED: { variant: 'green', label: 'Completado' },
    DELAYED: { variant: 'red', label: 'Atrasado' },
  }
  const { variant, label } = map[status] || { variant: 'gray', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

export function paymentStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PENDING: { variant: 'red', label: 'Pendiente' },
    PARTIAL: { variant: 'orange', label: 'Parcial' },
    PAID: { variant: 'green', label: 'Pagado' },
  }
  const { variant, label } = map[status] || { variant: 'gray', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

export function contentStatusBadge(status: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PENDING: { variant: 'gray', label: 'Pendiente' },
    EDITING: { variant: 'yellow', label: 'En Edición' },
    APPROVED: { variant: 'blue', label: 'Aprobado' },
    PUBLISHED: { variant: 'purple', label: 'Publicado' },
    COMPLETED: { variant: 'green', label: 'Completado' },
  }
  const { variant, label } = map[status] || { variant: 'gray', label: status }
  return <Badge variant={variant}>{label}</Badge>
}

export function contentTypeBadge(type: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    REEL: { variant: 'purple', label: 'Reel' },
    CAROUSEL: { variant: 'blue', label: 'Carrusel' },
    FLYER: { variant: 'orange', label: 'Flyer' },
  }
  const { variant, label } = map[type] || { variant: 'gray', label: type }
  return <Badge variant={variant}>{label}</Badge>
}
