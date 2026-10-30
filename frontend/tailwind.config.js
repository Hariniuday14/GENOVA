/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: "#050b14",
          900: "#070f1b",
          850: "#091422",
          800: "#0b1727",
          750: "#0d1c2e",
          700: "#10223a",
          600: "#16304c",
        },
        ink: {
          DEFAULT: "#e8f1fa",
          secondary: "#a2b5c9",
          muted: "#7388a0",
          faint: "#536a82",
        },
        accent: {
          cyan: "#2dd4e6",
          teal: "#2dd4bf",
          blue: "#4f8dfd",
        },
        line: {
          DEFAULT: "rgba(148, 178, 210, 0.14)",
          strong: "rgba(148, 178, 210, 0.24)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -28px rgba(0,0,0,0.9)",
        lift: "0 24px 60px -32px rgba(0,0,0,0.95)",
        glow: "0 0 0 1px rgba(45,212,230,0.28), 0 16px 40px -20px rgba(45,212,230,0.35)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(148,178,210,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(148,178,210,0.045) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
