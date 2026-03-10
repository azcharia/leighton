/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f0ff',
          100: '#b3d0ff',
          500: '#1565C0',
          700: '#003A8C',
          900: '#001f5b',
        },
      },
    },
  },
  plugins: [],
}
