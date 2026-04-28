/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gold: {
          DEFAULT: "#c9a84c",
          light: "#e4c87a",
          dark: "#8b6914",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glass:
          "0 8px 32px 0 rgba(0,0,0,0.37), inset 0 1px 0 rgba(255,255,255,0.18)",
        "glass-sm":
          "0 4px 16px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
        "gold-glow": "0 0 24px rgba(201,168,76,0.4)",
        "tooltip-b":
          "8px 10px 10px -13px rgba(255,255,255,1), -8px 9px 10px -13px rgba(255,255,255,1), 0px 23px 40px -10px rgba(255,255,255,1)",
        "tooltip-t":
          "8px -10px 10px -13px rgba(255,255,255,1), -8px -9px 10px -13px rgba(255,255,255,1), 0px -23px 40px -10px rgba(255,255,255,1)",
        "tooltip-r": "-12px 0px 12px -10px rgba(255,255,255,1)",
        "tooltip-l": "12px 0px 12px -10px rgba(255,255,255,1)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        "flash-in": {
          "0%": { opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        marquee: "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        flash: "flash-in 0.4s ease-in-out",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "scale-in": "scale-in 0.5s ease-out forwards",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};
