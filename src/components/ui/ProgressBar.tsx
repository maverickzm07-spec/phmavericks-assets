interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ProgressBar({ value, max = 100, label, showPercent = true, size = 'md' }: ProgressBarProps) {
  const percent = Math.min(100, Math.round((value / max) * 100))
  const heightClass = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }[size]

  const getColor = () => {
    if (percent >= 100) return '#22c55e'
    if (percent >= 70) return '#3b82f6'
    if (percent >= 40) return '#f59e0b'
    return '#8B0000'
  }

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-zinc-400">{label}</span>}
          {showPercent && <span className="text-xs font-semibold text-zinc-300">{percent}%</span>}
        </div>
      )}
      <div className={`w-full bg-zinc-800 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: getColor() }}
        />
      </div>
    </div>
  )
}
