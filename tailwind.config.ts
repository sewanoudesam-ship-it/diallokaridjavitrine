import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#F2CB30",
          yellowDeep: "#D9AD13",
          ivory: "#FBF9F3",
          paper: "#FFFFFF",
          ink: "#292720",
          muted: "#746F62",
          gold: "#B49758",
          line: "#E8E2D5",
          whatsapp: "#168C5B",
        },
      },
      boxShadow: {
        soft: "0 18px 56px rgba(41, 39, 32, 0.08)",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
