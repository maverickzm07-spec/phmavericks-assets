'use client'

interface SparklineProps {
  data?: number[]
  color?: string
  fillColor?: string
  height?: number
  className?: string
  showDots?: boolean
}

/**
 * Mini gráfico de línea SVG puro para hero/cards.
 * No requiere dependencias. Usa datos sintéticos elegantes si no se pasan.
 */
export default function Sparkline({
  data,
  color = '#E50914',
  fillColor = 'rgba(229, 9, 20, 0.15)',
  height = 80,
  className = '',
  showDots = true,
}: SparklineProps) {
  // Datos por defecto suaves y ascendentes con un pequeño dip
  const points = data && data.length > 1 ? data : [12, 18, 14, 22, 28, 26, 34, 30, 42, 38, 48, 56]
  const W = 320
  const H = height
  const padding = 4
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1

  const xStep = (W - padding * 2) / (points.length - 1)
  const coords = points.map((v, i) => {
    const x = padding + i * xStep
    const y = padding + (H - padding * 2) * (1 - (v - min) / range)
    return [x, y] as const
  })

  const path = coords
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`))
    .join(' ')
  const areaPath = `${path} L ${(W - padding).toFixed(1)} ${H - padding} L ${padding} ${H - padding} Z`

  const lastX = coords[coords.length - 1][0]
  const lastY = coords[coords.length - 1][1]

  const gid = 'sparkline-grad-' + color.replace('#', '')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id={gid + '-line'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9A84C" />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor="#E5C76B" />
        </linearGradient>
        <filter id={gid + '-glow'} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path
        d={path}
        fill="none"
        stroke={`url(#${gid}-line)`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${gid}-glow)`}
      />
      {showDots && (
        <>
          <circle cx={lastX} cy={lastY} r="6" fill={color} opacity="0.18" />
          <circle cx={lastX} cy={lastY} r="3" fill="#FFFFFF" />
          <circle cx={lastX} cy={lastY} r="3" fill={color} opacity="0.6" />
        </>
      )}
    </svg>
  )
}
