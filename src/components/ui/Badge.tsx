interface BadgeProps {
  variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const variants: Record<BadgeProps['variant'], string> = {
  green: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-[0_0_12px_rgba(16,185,129,0.18)]',
  yellow: 'bg-amber-950/60 text-amber-300 border-amber-700/60 shadow-[0_0_12px_rgba(245,158,11,0.20)]',
  red: 'bg-red-950/60 text-red-300 border-red-800/70 shadow-[0_0_12px_rgba(229,9,20,0.25)]',
  blue: 'bg-blue-950/60 text-blue-300 border-blue-700/60 shadow-[0_0_12px_rgba(59,130,246,0.18)]',
  gray: 'bg-zinc-800/60 text-zinc-300 border-zinc-700/70',
  purple: 'bg-purple-950/60 text-purple-300 border-purple-700/60 shadow-[0_0_12px_rgba(139,92,246,0.20)]',
  orange: 'bg-orange-950/60 text-orange-300 border-orange-700/60 shadow-[0_0_12px_rgba(249,115,22,0.20)]',
}

const dotColors: Record<BadgeProps['variant'], string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  gray: 'bg-zinc-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
}

export default function Badge({ variant, children, size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5'
  return (
    <span className={'inline-flex items-center rounded-md font-medium border backdrop-blur-sm transition-all ' + sizeClass + ' ' + variants[variant]}>
      <span className={'w-1.5 h-1.5 rounded-full ' + dotColors[variant] + ' shadow-[0_0_6px_currentColor]'} />
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
    IN_PROGRESS: { variant: 'yellow', label: 'En Proceso' },
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
    EDITING: { variant: 'yellow', label: 'En Edicion' },
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
