import { forwardRef, HTMLAttributes } from 'react'

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: 'none' | 'red' | 'gold'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: 'div' | 'section' | 'article'
}

/**
 * Tarjeta oscura premium PHMavericks.
 * - Fondo charcoal con borde sutil
 * - Hairline gradient brillante en top (vía ::before en globals.css .premium-card)
 * - Hover: leve elevación + borde dorado
 * - Glow opcional rojo/dorado
 */
const PremiumCard = forwardRef<HTMLDivElement, PremiumCardProps>(function PremiumCard(
  { className = '', hover = false, glow = 'none', padding = 'md', children, ...props },
  ref
) {
  const padMap = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6 md:p-8',
  }
  const glowMap = {
    none: '',
    red: 'shadow-glow-red',
    gold: 'shadow-glow-gold',
  }
  return (
    <div
      ref={ref}
      className={[
        'premium-card',
        hover ? 'premium-card-hover' : '',
        padMap[padding],
        glowMap[glow],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
})

export default PremiumCard
