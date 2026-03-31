import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--app-border)",
        ring: "var(--app-border-strong)",
        foreground: "var(--app-fg)",
        muted: {
          DEFAULT: "var(--app-surface-muted)",
          foreground: "var(--app-muted)",
        },
        card: "var(--app-surface-strong)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        elevated:
          "0 4px 16px -2px rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)",
        prominent:
          "0 16px 48px -8px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)",
        "prominent-warm":
          "0 20px 60px -8px rgb(120 53 15 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.03)",
      },
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
