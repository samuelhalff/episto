import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          light: "#FCD34D",
        },
        secondary: {
          DEFAULT: "#111827",
          light: "#1F2937",
        },
        accent: "#c53030",
        success: "#276749",
        destructive: "#c53030",
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        border: "#e2e8f0",
        ring: "#F59E0B",
        card: "#ffffff",
        foreground: "#0f172a",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
