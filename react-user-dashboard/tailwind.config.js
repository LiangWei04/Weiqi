/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#FCF8F8',
          bgDeep: '#FCF8F8',
          surface: '#FFFFFF',
          surfaceSoft: '#FCF8F8',
          border: '#EADDDD',
          cyan: '#A84466',
          green: '#4C7666',
          red: '#B63E57',
          amber: '#80555D',
          blue: '#2563eb',
          text: '#342D32',
          muted: '#76686F',
          ink: '#342D32',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: 'none',
        glow: '0 12px 35px rgba(52,45,50,.12)',
      },
      borderRadius: {
        panel: '16px',
      },
    },
  },
  plugins: [],
};
