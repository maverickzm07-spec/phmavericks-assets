'use client'

import { ReactNode } from 'react'
import PremiumCard from './PremiumCard'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  height?: number
}

export default function ChartCard({ title, subtitle, action, children, className = '', height = 260 }: ChartCardProps) {
  return (
    <PremiumCard padding="md" className={className}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
          {subtitle && <p className="text-xs text-phm-gray-soft mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </PremiumCard>
  )
}
