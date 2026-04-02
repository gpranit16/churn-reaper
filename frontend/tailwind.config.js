/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      display: ['Outfit', 'sans-serif'],
      sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
    extend: {
      colors: {
        background: '#030303',
        surface: '#05090f',
        'surface-low': '#0b1322',
        'surface-high': '#172034',
        'on-surface': '#e2e8f0', // slate-200
        'on-surface-variant': '#94a3b8', // slate 400
        primary: '#22d3ee', // cyan-400
        'primary-container': '#0369a1',
        tertiary: '#f43f5e',
        zinc: {
          100: '#f0f9ff',
          200: '#e2e8f0',
          300: '#cbd5e1',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      boxShadow: {
        'ambient-primary': '0 0 40px rgba(34, 211, 238, 0.12)',
        'ambient-tertiary': '0 0 40px rgba(244, 63, 94, 0.1)',
      }
    },
  },
  plugins: [],
}
