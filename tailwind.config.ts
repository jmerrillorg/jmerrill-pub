import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── JMP BRAND COLORS ──────────────────────────────────
      colors: {
        // JM1 Master
        jm1: {
          primary:   '#002C54',
          secondary: '#A3C4DC',
          accent:    '#F4B400',
          dark:      '#0A1F33',
          surface:   '#112E4A',
        },
        // Publishing Division
        blue: {
          50:  '#E8F3FF',
          100: '#C2DEFF',
          200: '#8BBFFF',
          300: '#5AA3FF',
          400: '#2E93FF',
          500: '#1E90FF',  // Dodger Blue — primary
          600: '#0A7AE8',
          700: '#005FC0',
          800: '#004499',
          900: '#001E4A',
        },
        slate: {
          50:  '#EEEDF8',
          100: '#D5D2F0',
          500: '#6A5ACD',  // Slate Blue — secondary
          700: '#4A3DAD',
        },
        sky: {
          DEFAULT: '#A3C4DC',  // Sky Blue — JM1 accent
        },
        // Base
        charcoal: '#111111',
        ink:      '#0D0D10',
        paper:    '#F7F8FA',
        'off-white': '#F2F4F7',
      },

      // ── TYPOGRAPHY ────────────────────────────────────────
      fontFamily: {
        display: ['Libre Baskerville', 'Georgia', 'serif'],
        body:    ['Outfit', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(52px, 6vw, 96px)', { lineHeight: '1.0', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(40px, 5vw, 72px)',  { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(32px, 4vw, 54px)',  { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(24px, 3vw, 36px)',  { lineHeight: '1.2',  letterSpacing: '-0.015em' }],
      },

      // ── SPACING ───────────────────────────────────────────
      spacing: {
        section: '120px',
        'section-sm': '80px',
      },

      // ── BORDER RADIUS ─────────────────────────────────────
      borderRadius: {
        card: '16px',
        'card-lg': '24px',
      },

      // ── ANIMATION ─────────────────────────────────────────
      animation: {
        'ticker':       'ticker 28s linear infinite',
        'float':        'float 8s ease-in-out infinite',
        'badge-pulse':  'badgePulse 3s ease-in-out infinite',
        'fade-up':      'fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) both',
        'panel-reveal': 'panelReveal 1s cubic-bezier(0.16,1,0.3,1) both',
        'word-reveal':  'wordReveal 0.8s cubic-bezier(0.16,1,0.3,1) both',
        'count-in':     'countIn 1.8s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        ticker: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-10px) rotate(1deg)' },
          '66%':      { transform: 'translateY(-5px) rotate(-0.5deg)' },
        },
        badgePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(30,144,255,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(30,144,255,0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        panelReveal: {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to:   { clipPath: 'inset(0 0% 0 0)' },
        },
        wordReveal: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        countIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },

      // ── SHADOWS ───────────────────────────────────────────
      boxShadow: {
        'blue-sm': '0 4px 16px rgba(30,144,255,0.15)',
        'blue-md': '0 8px 32px rgba(30,144,255,0.20)',
        'blue-lg': '0 20px 60px rgba(30,144,255,0.25)',
        'blue-cta':'0 4px 24px rgba(30,144,255,0.40)',
      },
    },
  },
  plugins: [],
}

export default config
