import type { Config } from "tailwindcss";

// Charte FitMeIn : deep purple, orange-yellow, gris, noir, blanc. Mode sombre natif.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0910",
        surface: "#15111F",
        surface2: "#1D1830",
        line: "#2D2645",
        purple: { DEFAULT: "#4B1E8F", hi: "#A88BF5" },
        amber: { DEFAULT: "#FFB321" },
        grey: "#9B95AC",
        ink: "#F6F4FB",
        ok: "#3DBE84",
        ko: "#EF5257",
      },
      fontFamily: {
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        sans: ["var(--font-dmsans)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px" },
      minHeight: { tap: "44px" },
      spacing: { tabbar: "calc(76px + env(safe-area-inset-bottom))" },
    },
  },
  plugins: [],
};
export default config;
