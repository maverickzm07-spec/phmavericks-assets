import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial PHMavericks
        phm: {
          black: '#050506',
          dark: '#09090B',
          charcoal: '#111113',
          'charcoal-2': '#111113',
          card: '#18181B',
          surface: '#141417',
          'surface-2': '#1A1A1F',
          border: '#27272A',
          'border-soft': '#1F1F23',
          red: '#8B0000',
          'red-mid': '#B00000',
          'red-bright': '#E50914',
          redBright: '#E50914',
          'red-hover': '#A00000',
          'red-light': '#C62828',
          gold: '#C9A84C',
          'gold-soft': '#A88B3A',
          'gold-bright': '#E5C76B',
          white: '#FFFFFF',
          gray: '#A1A1AA',
          'gray-soft': '#71717A',
          muted: '#A1A1AA',
          ok: '#22C55E',
          warn: '#F59E0B',
          danger: '#DC2626',
          info: '#3B82F6',
          purple: '#8B5CF6',
        },
        brand: {
          red: '#8B0000',
          'red-hover': '#A00000',
          'red-light': '#C62828',
          gold: '#C9A84C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 24px rgba(139, 0, 0, 0.35)',
        'glow-red-strong': '0 0 40px rgba(229, 9, 20, 0.45)',
        'glow-gold': '0 0 24px rgba(201, 168, 76, 0.30)',
        'glow-gold-strong': '0 0 40px rgba(201, 168, 76, 0.45)',
        'premium': '0 8px 32px -8px rgba(0, 0, 0, 0.6), 0 2px 8px -2px rgba(0, 0, 0, 0.5)',
        'premium-hover': '0 16px 48px -12px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(139, 0, 0, 0.25)',
        'inset-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      },
      backgroundImage: {
        'gradient-hero': 'radial-gradient(circle at 20% 30%, rgba(139, 0, 0, 0.18), transparent 55%), radial-gradient(circle at 80% 70%, rgba(201, 168, 76, 0.10), transparent 60%), linear-gradient(135deg, #0F0F12 0%, #18181B 100%)',
        'gradient-active': 'linear-gradient(135deg, rgba(139, 0, 0, 0.95) 0%, rgba(176, 0, 0, 0.85) 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C9A84C 0%, #E5C76B 100%)',
        'gradient-red-soft': 'linear-gradient(135deg, rgba(139, 0, 0, 0.12) 0%, rgba(229, 9, 20, 0.04) 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 0, 0, 0.25)' },
          '50%': { boxShadow: '0 0 32px rgba(229, 9, 20, 0.45)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
