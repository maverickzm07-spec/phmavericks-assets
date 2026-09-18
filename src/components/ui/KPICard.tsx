'use client'

import Link from 'next/link'
import { ArrowUpRight, LucideIcon } from 'lucide-react'
import PremiumCard from './PremiumCard'

type Tone = 'red' | 'gold' | 'green' | 'blue' | 'purple' | 'amber' | 'danger'

const toneStyles: Record<Tone, { iconBg: string; iconRing: string; iconColor: string; accent: string }> = {
  red: {
    iconBg: 'bg-red-950/70',
    iconRing: 'ring-1 ring-red-800/60',
    iconColor: 'text-white',
    accent: 'rgba(229, 9, 20, 0.18)',
  },
  gold: {
    iconBg: 'bg-amber-950/70',
    iconRing: 'ring-1 ring-amber-700/60',
    iconColor: 'text-phm-gold-bright',
    accent: 'rgba(201, 168, 76, 0.20)',
  },
  green: {
    iconBg: 'bg-emerald-950/70',
    iconRing: 'ring-1 ring-emerald-700/60',
    iconColor: 'text-white',
    accent: 'rgba(34, 197, 94, 0.18)',
  },
  blue: {
    iconBg: 'bg-blue-950/70',
    iconRing: 'ring-1 ring-blue-700/60',
    iconColor: 'text-white',
    accent: 'rgba(59, 130, 246, 0.18)',
  },
  purple: {
    iconBg: 'bg-purple-950/70',
    iconRing: 'ring-1 ring-purple-700/60',
    iconColor: 'text-white',
    accent: 'rgba(139, 92, 246, 0.20)',
  },
  amber: {
    iconBg: 'bg-amber-950/70',
    iconRing: 'ring-1 ring-amber-700/60',
    iconColor: 'text-white',
    accent: 'rgba(245, 158, 11, 0.18)',
  },
  danger: {
    iconBg: 'bg-red-950/70',
    iconRing: 'ring-1 ring-red-700/60',
    iconColor: 'text-white',
    accent: 'rgba(220, 38, 38, 0.22)',
  },
}

interface KPICardProps {
  icon: LucideIcon
  value: string | number
  title: string
  subtitle?: string
  tone?: Tone
  href?: string
  ctaLabel?: string
  progress?: number // 0..100
  className?: string
}

export default function KPICard({
  icon: Icon,
  value,
  title,
  subtitle,
  tone = 'red',
  href,
  ctaLabel,
  progress,
  className = '',
}: KPICardProps) {
  const t = toneStyles[tone]
  const inner = (
    <PremiumCard hover padding="md" className={`group ${className}`}>
      {/* Glow decorativo en esquina */}
      <div
        aria-hidden
        className="absolute right-0 top-0 h-full w-1 opacity-80"
        style={{ background: t.accent }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.iconBg} ${t.iconRing}`}
        >
          <Icon className={`w-5 h-5 ${t.iconColor}`} strokeWidth={2} />
        </div>
        {href && ctaLabel && (
          <span className="text-[11px] font-medium text-phm-gray-soft group-hover:text-phm-gold transition-colors flex items-center gap-1">
            {ctaLabel}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="relative mt-4">
        <p className="text-3xl font-bold tracking-tight text-white leading-none">{value}</p>
        <p className="text-sm font-medium text-phm-gray mt-2">{title}</p>
        {subtitle && <p className="text-xs text-phm-gray-soft mt-1">{subtitle}</p>}

        {typeof progress === 'number' && (
          <div className="mt-4 h-1.5 w-full rounded-full bg-phm-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: 'linear-gradient(90deg, #C9A84C 0%, #E50914 100%)',
                boxShadow: '0 0 10px rgba(201, 168, 76, 0.5)',
              }}
            />
          </div>
        )}
      </div>
    </PremiumCard>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-phm-gold/50 rounded-2xl">
        {inner}
      </Link>
    )
  }
  return inner
}
