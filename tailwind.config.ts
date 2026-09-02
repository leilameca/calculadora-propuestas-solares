import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "rgb(var(--brand-primary) / <alpha-value>)",
        secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
        accent: "rgb(var(--brand-accent) / <alpha-value>)",
      },
      boxShadow: { panel: "0 1px 2px rgb(15 23 42 / .05), 0 8px 24px rgb(15 23 42 / .06)" },
    },
  },
  plugins: [],
} satisfies Config;
