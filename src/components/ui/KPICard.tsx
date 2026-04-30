'use client'

import Link from 'next/link'
import { ArrowUpRight, LucideIcon } from 'lucide-react'
import PremiumCard from './PremiumCard'

type Tone = 'red' | 'gold' | 'green' | 'blue' | 'purple' | 'amber' | 'danger'

const toneStyles: Record<Tone, { iconBg: string; iconRing: string; iconColor: string; accent: string }> = {
  red: {
    iconBg: 'bg-gradient-to-br from-[#8B0000] to-[#B00000]',
    iconRing: 'ring-1 ring-[#E50914]/40',
    iconColor: 'text-white',
    accent: 'rgba(229, 9, 20, 0.18)',
  },
  gold: {
    iconBg: 'bg-gradient-to-br from-[#A88B3A] to-[#C9A84C]',
    iconRing: 'ring-1 ring-[#E5C76B]/45',
    iconColor: 'text-phm-black',
    accent: 'rgba(201, 168, 76, 0.20)',
  },
  green: {
    iconBg: 'bg-gradient-to-br from-emerald-700 to-emerald-500',
    iconRing: 'ring-1 ring-emerald-400/45',
    iconColor: 'text-white',
    accent: 'rgba(34, 197, 94, 0.18)',
  },
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-700 to-blue-500',
    iconRing: 'ring-1 ring-blue-400/40',
    iconColor: 'text-white',
    accent: 'rgba(59, 130, 246, 0.18)',
  },
  purple: {
    iconBg: 'bg-gradient-to-br from-purple-700 to-fuchsia-500',
    iconRing: 'ring-1 ring-purple-400/40',
    iconColor: 'text-white',
    accent: 'rgba(139, 92, 246, 0.20)',
  },
  amber: {
    iconBg: 'bg-gradient-to-br from-amber-700 to-amber-500',
    iconRing: 'ring-1 ring-amber-400/45',
    iconColor: 'text-white',
    accent: 'rgba(245, 158, 11, 0.18)',
  },
  danger: {
    iconBg: 'bg-gradient-to-br from-red-800 to-red-600',
    iconRing: 'ring-1 ring-red-400/45',
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
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: t.accent }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.iconBg} ${t.iconRing} shadow-lg`}
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
