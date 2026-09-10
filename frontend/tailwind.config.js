/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
    },
    extend: {
      colors: {
        background: '#080b11',
        surface: {
          DEFAULT: '#0f141f',
          low: '#0a0e17',
          high: '#151b2a',
          higher: '#1c2438',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-subtle': 'rgba(255, 255, 255, 0.04)',
        },
        'on-surface': '#f1f5f9',
        'on-surface-variant': '#94a3b8',
        'on-surface-muted': '#64748b',
        brand: {
          DEFAULT: '#0284c7',
          light: '#38bdf8',
          dark: '#0369a1',
          subtle: 'rgba(2, 132, 199, 0.12)',
        },
        risk: {
          high: '#ef4444',
          'high-bg': 'rgba(239, 68, 68, 0.12)',
          'high-border': 'rgba(239, 68, 68, 0.28)',
          medium: '#f59e0b',
          'medium-bg': 'rgba(245, 158, 11, 0.12)',
          'medium-border': 'rgba(245, 158, 11, 0.28)',
          low: '#10b981',
          'low-bg': 'rgba(16, 185, 129, 0.12)',
          'low-border': 'rgba(16, 185, 129, 0.28)',
        },
      },
      boxShadow: {
        'panel': '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'panel-hover': '0 4px 16px -2px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'modal': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
}
