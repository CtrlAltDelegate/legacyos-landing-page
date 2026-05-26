/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d1ff',
          300: '#9db2ff',
          400: '#7289ff',
          500: '#4f63f7',
          600: '#3a47ec',
          700: '#2f37d1',
          800: '#2930aa',
          900: '#272e86',
          950: '#181c52',
        },
        surface: {
          0:    '#FFFFFF',
          1:    '#F8F8FB',
          2:    '#F1F1F6',
          card: '#FFFFFF',
        },
      },
      boxShadow: {
        'sm':  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'md':  '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'lg':  '0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.04)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
