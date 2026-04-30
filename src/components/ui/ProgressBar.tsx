interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ProgressBar({ value, max = 100, label, showPercent = true, size = 'md' }: ProgressBarProps) {
  const percent = Math.min(100, Math.round((value / max) * 100))
  const heightClass = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' }[size]

  const getGradient = () => {
    if (percent >= 100) return 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
    if (percent >= 70) return 'linear-gradient(90deg, #C9A84C 0%, #E5C76B 100%)'
    if (percent >= 40) return 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)'
    return 'linear-gradient(90deg, #8B0000 0%, #E50914 100%)'
  }
  const getGlow = () => {
    if (percent >= 100) return '0 0 10px rgba(16, 185, 129, 0.5)'
    if (percent >= 70) return '0 0 10px rgba(201, 168, 76, 0.5)'
    if (percent >= 40) return '0 0 10px rgba(245, 158, 11, 0.45)'
    return '0 0 10px rgba(229, 9, 20, 0.5)'
  }

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-zinc-400">{label}</span>}
          {showPercent && (
            <span className="text-xs font-semibold text-zinc-200 tabular-nums">{percent}%</span>
          )}
        </div>
      )}
      <div className={'relative w-full bg-zinc-900 ring-1 ring-zinc-800/80 rounded-full overflow-hidden ' + heightClass}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: percent + '%',
            background: getGradient(),
            boxShadow: getGlow(),
          }}
        />
      </div>
    </div>
  )
}
