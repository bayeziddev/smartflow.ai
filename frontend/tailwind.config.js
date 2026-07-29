/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#080B13', // page background — deep space, not flat black
          surface: '#11172A', // card / panel background
          elevated: '#171E38', // hovered / active surface
          border: '#232B4A',
        },
        signal: {
          // SmartGen brand blue — matches the real logo now that we have one.
          DEFAULT: '#2563EB',
          dim: '#1D4ED8',
        },
        intel: {
          // SmartGen brand orange — the lightning-bolt color in the logo.
          DEFAULT: '#F97316',
          dim: '#C2570D',
        },
        wire: {
          // used ONLY for a live/connected state — kept rare on purpose
          on: '#39FF88',
          off: '#4A5578',
        },
        amber: { DEFAULT: '#FFB443' },
        rose: { DEFAULT: '#FF4D6D' },
        ink: {
          DEFAULT: '#E9ECF8',
          muted: '#8B93B2',
          faint: '#565F82',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-signal': '0 0 0 1px rgba(0,229,255,0.35), 0 0 24px rgba(0,229,255,0.25)',
        'glow-intel': '0 0 0 1px rgba(124,92,255,0.35), 0 0 24px rgba(124,92,255,0.25)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(35,43,74,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(35,43,74,0.35) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(0.85)' },
        },
        dash: {
          to: { strokeDashoffset: 0 },
        },
      },
      animation: {
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        dash: 'dash 1.6s linear forwards',
      },
    },
  },
  plugins: [],
};
