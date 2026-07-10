import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./styles/**/*.css"
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0A0A0F",
          soft: "#0F0F17",
          subtle: "#13131A"
        },
        primary: {
          DEFAULT: "#F59E0B",
          soft: "#D97706",
          accent: "#FB923C"
        },
        glow: {
          purple: "#FBBF24",
          cyan: "#FDBA74",
          indigo: "#F59E0B"
        }
      },
      boxShadow: {
        "soft-glow":
          "0 0 40px rgba(245, 158, 11, 0.2), 0 0 80px rgba(217, 119, 6, 0.12)",
        "border-glow": "0 0 0 1px rgba(251, 191, 36, 0.35)"
      },
      backgroundImage: {
        "noise": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='noStitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E\")",
        "radial-glow":
          "radial-gradient(circle at top, rgba(245, 158, 11, 0.18), transparent 60%), radial-gradient(circle at bottom, rgba(251, 146, 60, 0.10), transparent 55%)"
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem",
        "3xl": "2.25rem"
      }
    }
  },
  plugins: []
};

export default config;
