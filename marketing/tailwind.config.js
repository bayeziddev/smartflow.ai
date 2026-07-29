/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#080B13',
          surface: '#11172A',
          elevated: '#171E38',
          border: '#232B4A',
        },
        signal: { DEFAULT: '#2563EB', dim: '#1D4ED8' }, // SmartGen brand blue
        intel: { DEFAULT: '#F97316', dim: '#C2570D' }, // SmartGen brand orange
        wire: { on: '#39FF88', off: '#4A5578' },
        gold: { DEFAULT: '#FFC857', dim: '#8A6A2A' },
        amber: { DEFAULT: '#FFB443' },
        rose: { DEFAULT: '#FF4D6D' },
        ink: { DEFAULT: '#E9ECF8', muted: '#8B93B2', faint: '#565F82' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-signal': '0 0 0 1px rgba(0,229,255,0.35), 0 0 24px rgba(0,229,255,0.25)',
        'glow-gold': '0 0 0 1px rgba(255,200,87,0.4), 0 0 30px rgba(255,200,87,0.2)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(35,43,74,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(35,43,74,0.35) 1px, transparent 1px)',
      },
      backgroundSize: { grid: '48px 48px' },
      keyframes: {
        pulseDot: { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.4, transform: 'scale(0.85)' } },
        typeBlink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
      },
      animation: {
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        typeBlink: 'typeBlink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
