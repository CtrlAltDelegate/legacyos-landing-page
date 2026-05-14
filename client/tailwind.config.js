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
      },
    },
  },
  plugins: [],
}

