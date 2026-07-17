/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // Keep legacy primary for any unreachable old code
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        // ── Design system tokens ──────────────────────────────
        // Backgrounds
        'app-bg':     '#F0F2F7',
        'surface':    '#FFFFFF',
        // Text
        'text-1':     '#0A0D14',
        'text-2':     '#374151',
        'text-3':     '#B0B8C4',
        'text-4':     '#C4CBD6',
        // Primary accent — Teal
        'teal':       '#00C2B2',
        'teal-dk':    '#009E90',
        'teal-lt':    '#E6FAF9',
        // Navy (hero cards)
        'navy':       '#0B1A38',
        'navy-2':     '#0A2B38',
        // Semantic
        'danger':     '#E11D48',
        'danger-lt':  '#FFF1F3',
        'danger-mid': '#F43F5E',
        'success':    '#059669',
        'success-lt': '#F0FDF4',
        'success-mid':'#10B981',
        'warning':    '#F59E0B',
        'warning-lt': '#FFFBEB',
        'purple':     '#7C3AED',
        'purple-lt':  '#F5F3FF',
        'orange':     '#F97316',
        'orange-lt':  '#FFF0E5',
        'border':     '#E9ECF0',
      },
      borderRadius: {
        'r-sm':  '10px',
        'r-md':  '14px',
        'r-lg':  '20px',
        'r-xl':  '24px',
        'r-2xl': '28px',
        'r-pill':'999px',
      },
      fontSize: {
        'label':      ['9px',  { fontWeight: '800', letterSpacing: '0.05em' }],
        'caption':    ['11px', { fontWeight: '600' }],
        'body-sm':    ['12px', { fontWeight: '500' }],
        'body':       ['14px', { fontWeight: '700' }],
        'subtitle':   ['16px', { fontWeight: '800' }],
        'page-title': ['17px', { fontWeight: '800' }],
        'number-lg':  ['24px', { fontWeight: '800' }],
        'hero':       ['42px', { fontWeight: '800' }],
      },
      boxShadow: {
        'card': '0 2px 14px rgba(0,0,0,0.05)',
        'md':   '0 4px 20px rgba(0,0,0,0.08)',
        'icon': '0 2px 10px rgba(0,0,0,0.08)',
        'teal': '0 4px 20px rgba(0,194,178,0.5)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shake:   'shake 0.4s ease',
        fadeUp:  'fadeUp 0.2s ease forwards',
      },
    },
  },
  plugins: [],
};
