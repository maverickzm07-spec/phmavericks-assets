'use client'

interface Bar {
  label: string
  value: number
}

interface BarChartMiniProps {
  data: Bar[]
  max?: number
  height?: number
  formatValue?: (n: number) => string
}

/**
 * Gráfico de barras vertical premium en SVG puro.
 * Las barras usan degradado dorado→rojo y glow sutil.
 */
export default function BarChartMini({ data, max, height = 200, formatValue }: BarChartMiniProps) {
  const W = 100 * data.length
  const H = height
  const top = 24
  const bottom = 28
  const computedMax = max ?? Math.max(1, ...data.map((d) => d.value))
  const barW = 36

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', minWidth: data.length * 56, height: H }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E5C76B" />
            <stop offset="60%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#8B0000" />
          </linearGradient>
          <linearGradient id="barTrack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F1F23" />
            <stop offset="100%" stopColor="#141417" />
          </linearGradient>
        </defs>
        {/* gridlines sutiles */}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={i}
            x1={0}
            x2={W}
            y1={top + (H - top - bottom) * p}
            y2={top + (H - top - bottom) * p}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2 4"
          />
        ))}
        {data.map((d, i) => {
          const cx = 100 * i + 50
          const usable = H - top - bottom
          const h = (d.value / computedMax) * usable
          const y = H - bottom - h
          return (
            <g key={i}>
              {/* Track de fondo */}
              <rect
                x={cx - barW / 2}
                y={top}
                width={barW}
                height={usable}
                rx={6}
                fill="url(#barTrack)"
              />
              {/* Barra */}
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                rx={6}
                fill="url(#barGrad)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(229,9,20,0.25))' }}
              />
              {/* Valor */}
              <text
                x={cx}
                y={y - 6}
                fontSize="11"
                fontWeight={600}
                fill="#FFFFFF"
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {formatValue ? formatValue(d.value) : d.value}
              </text>
              {/* Etiqueta */}
              <text
                x={cx}
                y={H - 8}
                fontSize="11"
                fill="#71717A"
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
