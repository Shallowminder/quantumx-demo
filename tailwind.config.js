/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4EE",
        canvas: "#FBFAF7",
        ink: "#252521",
        muted: "#6F706B",
        line: "#E5E0D6",
        sage: "#66786A",
        mist: "#E9EEF0",
        clay: "#B37A54",
        amber: "#D8B56D",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 16px 44px rgba(45, 43, 37, 0.06)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.7)",
      },
    },
  },
  plugins: [],
};
