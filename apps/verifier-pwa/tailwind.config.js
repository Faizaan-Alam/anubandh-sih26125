/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { navy: "#1b2a4a", paper: "#f4f6f8", line: "#d0d7de", accent: "#1f4e79" },
      fontFamily: { sans: ['"Source Sans 3"', "Segoe UI", "sans-serif"] }
    }
  },
  plugins: []
};
