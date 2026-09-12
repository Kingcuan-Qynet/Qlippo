import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f5",
          100: "#ffe0ea",
          200: "#ffc2d6",
          300: "#ff94b3",
          400: "#ff5c8a",
          500: "#fc2b63",
          600: "#e01352",
          700: "#bd0a46",
          800: "#9c0c40",
          900: "#850e3c",
          950: "#4a041c"
        }
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
