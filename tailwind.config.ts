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
          black: '#050505',
          dark: '#09090B',
          charcoal: '#121214',
          'charcoal-2': '#121214',
          card: '#1A1A1D',
          surface: '#1A1A1D',
          'surface-2': '#232327',
          border: 'rgba(255,255,255,0.14)',
          'border-soft': 'rgba(255,255,255,0.08)',
          red: '#8B0000',
          'red-mid': '#B00000',
          'red-bright': '#C41E1E',
          redBright: '#C41E1E',
          'red-hover': '#660000',
          'red-light': '#C62828',
          white: '#FFFFFF',
          gray: '#A5A5AC',
          'gray-soft': '#6E6E76',
          muted: '#A5A5AC',
          // Estado. Deliberadamente fuera del rojo de marca: si el rojo acentúa
          // botones, iconos y gráficas, un rojo de alerta se pierde entre ellos.
          // El crítico es un rojo más claro y saturado, distinguible del #8B0000.
          ok: '#3FB97F',
          warn: '#E0A33C',
          danger: '#F0564A',
          info: '#3B82F6',
          purple: '#8B5CF6',
          // Superficies del rediseño
          'g1': '#121214',
          'g2': '#1A1A1D',
          'g3': '#232327',
        },
        brand: {
          red: '#8B0000',
          'red-hover': '#660000',
          'red-light': '#C62828',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Avenir Next', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-jakarta)', 'Avenir Next', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        panel: '22px',
        hero: '28px',
      },
      boxShadow: {
        'glow-red': '0 0 24px rgba(139, 0, 0, 0.35)',
        'glow-red-strong': '0 0 40px rgba(229, 9, 20, 0.45)',
        // Dos capas: una de contacto y otra de elevación. Es lo que da la
        // sensación de panel flotante en vez de bloque plano.
        'premium': '0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35)',
        'premium-hover': '0 2px 4px rgba(0,0,0,.5), 0 16px 48px rgba(0,0,0,.45)',
        'boton-rojo': '0 4px 16px rgba(139, 0, 0, 0.45)',
        'boton-rojo-hover': '0 6px 22px rgba(139, 0, 0, 0.6)',
        'inset-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      },
      backgroundImage: {
        'gradient-hero': 'radial-gradient(circle at 20% 30%, rgba(139, 0, 0, 0.18), transparent 55%), linear-gradient(135deg, #0F0F12 0%, #18181B 100%)',
        'gradient-active': 'linear-gradient(135deg, rgba(139, 0, 0, 0.95) 0%, rgba(176, 0, 0, 0.85) 100%)',
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
