/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent-color-value)',
          text: 'var(--accent-color-value)',
          bg: 'var(--accent-color-value)',
          border: 'var(--accent-color-value)',
          ring: 'var(--accent-color-value)',
          50: 'color-mix(in srgb, var(--accent-color-value) 10%, white)',
          100: 'color-mix(in srgb, var(--accent-color-value) 20%, white)',
          200: 'color-mix(in srgb, var(--accent-color-value) 30%, white)',
          300: 'color-mix(in srgb, var(--accent-color-value) 40%, white)',
          400: 'color-mix(in srgb, var(--accent-color-value) 50%, white)',
          500: 'var(--accent-color-value)',
          600: 'color-mix(in srgb, var(--accent-color-value) 80%, black)',
          700: 'color-mix(in srgb, var(--accent-color-value) 60%, black)',
          800: 'color-mix(in srgb, var(--accent-color-value) 40%, black)',
          900: 'color-mix(in srgb, var(--accent-color-value) 20%, black)',
          950: 'color-mix(in srgb, var(--accent-color-value) 10%, black)',
        },
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
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

