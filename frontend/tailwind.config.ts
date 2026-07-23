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
        primary: {
          DEFAULT: "var(--action-primary-bg)",
          foreground: "var(--action-primary-fg)",
          light: "var(--action-choice-active-bg)",
        },
        muted: {
          DEFAULT: "var(--app-surface-muted)",
          foreground: "var(--app-muted)",
        },
        card: "var(--app-surface-strong)",
        success: "#16a34a",
        destructive: "#dc2626",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        // Restrained shadows. Depth belongs to real/rendered paper artifacts,
        // not to navigation, panels, or template rows — so the ambient
        // "floating card" look is gone; dialogs keep a modest lift.
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        elevated: "0 2px 6px -2px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        prominent: "0 8px 24px -8px rgb(0 0 0 / 0.10), 0 2px 6px -4px rgb(0 0 0 / 0.05)",
        "prominent-warm": "0 1px 2px 0 rgb(22 22 22 / 0.05)",
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
