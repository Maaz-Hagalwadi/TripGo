/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#00d4ff",
        "accent": "#ffd700",
        "deep-black": "#050505",
        "charcoal": "#1a1a1a",
        "input-gray": "#2A2A2A",
        "silver-text": "#E0E0E0",
        "dark-gray": "#121212",
        "background-light": "#f8fafc",
        "op-bg": "#101e22",
        "op-card": "#1a1a1a",
        "op-sidebar": "#16272c",
        "op-table-head": "#222",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"]
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
