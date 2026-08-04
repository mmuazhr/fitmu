/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        surface: {
          DEFAULT: '#1e293b',
          card: '#334155',
          input: '#475569',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
};
