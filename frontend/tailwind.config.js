/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // LegacyOS warm neutral palette
        canvas: '#f8f7f3',
        ink: '#1a1a18',
        muted: '#73726c',
        subtle: '#888780',
        border: 'rgba(0,0,0,0.12)',
        // Flo blue
        flo: {
          50: '#e6f1fb',
          100: '#b5d4f4',
          600: '#378add',
          700: '#185fa5',
        },
        // Accent green (insights, positive)
        sage: {
          50: '#eaf3de',
          600: '#639922',
          700: '#3b6d11',
        },
        // Amber (warnings, restricted)
        amber: {
          50: '#faeeda',
          400: '#ef9f27',
          700: '#854f0b',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
