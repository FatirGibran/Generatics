import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          bg: "#0E152E",
          card: "#121B3B",
          surface: "#182245",
          border: "#233261",
          hover: "#1D2B56",
        },
        cream: {
          DEFAULT: "#FAF6EB",
          light: "#FFFDF8",
          dark: "#EFE6CE",
        },
        gold: {
          DEFAULT: "#FACC15",
          soft: "#FDE047",
          glow: "#FEF08A",
          dark: "#CA8A04",
        },
        periwinkle: {
          DEFAULT: "#818CF8",
          light: "#A5B4FC",
          dark: "#6366F1",
        },
        rose: {
          whimsy: "#F472B6",
        },
        stance: {
          pro: "#10B981",
          proBg: "#D1FAE5",
          kontra: "#F97316",
          kontraBg: "#FFEDD5",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 28px rgba(250,204,21,0.45)",
        "glow-peri": "0 0 28px rgba(129,140,248,0.35)",
        "paper": "0 18px 40px -12px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.4) inset",
      },
      animation: {
        "spin-slow": "spin 24s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
        "pop-in": "popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shake: "shake 0.45s ease-in-out",
        "marquee-chase": "chase 0.5s steps(2, jump-none) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-4deg)" },
          "75%": { transform: "rotate(4deg)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.6) translateY(20px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(3px)" },
        },
        chase: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0.25" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
