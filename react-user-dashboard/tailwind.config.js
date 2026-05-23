/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#121212',
          bgDeep: '#0b0f11',
          surface: '#1e1e1e',
          surfaceSoft: '#181818',
          border: '#2c2c2e',
          cyan: '#00e5ff',
          green: '#32d74b',
          red: '#ff453a',
          amber: '#ffd60a',
          blue: '#2563eb',
          text: '#ffffff',
          muted: '#98989d',
          ink: '#07142f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 44px rgba(0, 0, 0, 0.22)',
        glow: '0 0 0 1px rgba(0, 229, 255, 0.2), 0 24px 70px rgba(0, 0, 0, 0.45)',
      },
      borderRadius: {
        panel: '16px',
      },
    },
  },
  plugins: [],
};
