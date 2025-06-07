/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',   // Very light gray (for light mode text or elements if needed)
          100: '#f1f5f9',  // Light gray (primary text on dark bg)
          200: '#e2e8f0',  //
          300: '#cbd5e1',  // (secondary text on dark bg)
          400: '#94a3b8',  // (subtle text, icons, borders)
          500: '#64748b',  // Mid gray
          600: '#475569',  // Darker mid gray (borders, disabled elements)
          700: '#334155',  // (hover states on surface-alt, subtle elements)
          800: '#232428',  // --surface-alt
          850: '#1e1f22',  // A step between 800 and 900 if needed
          900: '#18191c',  // --surface
          950: '#121212',  // --background
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

