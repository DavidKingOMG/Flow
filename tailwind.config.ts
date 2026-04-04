import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./tests/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        text: "hsl(var(--text))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
        accentSoft: "hsl(var(--accent-soft))",
      },
      boxShadow: {
        glow: "0 24px 120px rgba(53, 214, 255, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
