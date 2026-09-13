/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', "Segoe UI", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"]
      }
    }
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "forest",
      "corporate",
      "business",
      "nord",
      "winter",
      "emerald",
      "aqua",
      "pastel",
      "dim",
      "night",
      "luxury",
      "synthwave"
    ],
    darkTheme: "night",
    logs: false
  }
};
