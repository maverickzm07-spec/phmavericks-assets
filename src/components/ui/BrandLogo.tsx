'use client'

import Image from 'next/image'

interface BrandLogoProps {
  variant?: 'full' | 'mini'
  className?: string
  priority?: boolean
}

/**
 * Logo oficial de PHMavericks.
 * El archivo está en /public/logo-phmavericks.png
 * Usa next/image para optimización.
 */
export default function BrandLogo({ variant = 'full', className = '', priority = false }: BrandLogoProps) {
  if (variant === 'mini') {
    // Versión mini: el mismo PNG escalado y recortado proporcionalmente
    return (
      <div className={`relative w-9 h-9 rounded-lg overflow-hidden bg-phm-black ring-1 ring-phm-border-soft ${className}`}>
        <Image
          src="/logo-phmavericks.png"
          alt="PHMavericks"
          fill
          sizes="36px"
          className="object-contain p-0.5"
          priority={priority}
        />
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: '942 / 296' }}>
      <Image
        src="/logo-phmavericks.png"
        alt="PHMavericks"
        fill
        sizes="(max-width: 768px) 200px, 240px"
        className="object-contain"
        priority={priority}
      />
    </div>
  )
}
