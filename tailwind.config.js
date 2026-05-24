/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0d0d0d',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#242424',
        'accent': '#a855f7',
        'accent-soft': '#7c3aed',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a3a3a3',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'border-color': '#2a2a2a',
        'bauhaus-red': '#CC2200',
        'bauhaus-yellow': '#F5C400',
        'bauhaus-blue': '#1B3A7A',
        'bauhaus-cream': '#F8F4EC',
      },
      fontFamily: {
        'display': ['Syne', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
