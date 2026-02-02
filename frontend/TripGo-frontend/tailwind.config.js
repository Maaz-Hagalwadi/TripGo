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
        "primary": "#00d4ff", // Electric Blue
        "accent": "#ffd700",  // Gold
        "deep-black": "#050505",
        "charcoal": "#1a1a1a",
        "input-gray": "#2A2A2A",
        "silver-text": "#E0E0E0",
        "dark-gray": "#121212",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}