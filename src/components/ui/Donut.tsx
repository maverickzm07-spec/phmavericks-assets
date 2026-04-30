'use client'

interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutProps {
  data: DonutSlice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string | number
}

/**
 * Donut SVG puro. Si todas las slices son 0, muestra anillo neutro.
 */
export default function Donut({ data, size = 180, thickness = 18, centerLabel, centerValue }: DonutProps) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2

  let offset = 0

  return (
    <div className="flex flex-col md:flex-row items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="#1F1F23"
            strokeWidth={thickness}
            fill="none"
          />
          {total > 0 &&
            data.map((d, i) => {
              const v = Math.max(0, d.value)
              const len = (v / total) * c
              const dasharray = `${len} ${c - len}`
              const dashoffset = -offset
              offset += len
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={d.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                  style={{
                    transition: 'stroke-dasharray 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                    filter: `drop-shadow(0 0 6px ${d.color}55)`,
                  }}
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue !== undefined && (
            <span className="text-3xl font-bold tracking-tight text-white">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[10px] uppercase tracking-wider text-phm-gray-soft mt-1">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      <ul className="flex-1 w-full space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
          return (
            <li key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: d.color, boxShadow: `0 0 8px ${d.color}80` }}
                />
                <span className="text-phm-gray truncate">{d.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-white font-semibold tabular-nums">{d.value}</span>
                <span className="text-phm-gray-soft text-xs tabular-nums">({pct}%)</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
