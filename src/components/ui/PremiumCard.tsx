import { forwardRef, HTMLAttributes } from 'react'

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: 'none' | 'red'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: 'div' | 'section' | 'article'
}

/**
 * Tarjeta base del sistema.
 *
 * Fondo grafito, borde semitransparente y un filo de luz de 1 px arriba
 * (ver `.card-premium` en globals.css): ese detalle es lo que da la sensación
 * de panel flotante en lugar de bloque plano. La sombra va en dos capas, una
 * de contacto y otra de elevación.
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
  return (
    <div
      ref={ref}
      className={[
        'card-premium',
        hover ? 'transition-shadow hover:shadow-premium-hover' : '',
        glow === 'red' ? 'shadow-glow-red' : '',
        padMap[padding],
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
