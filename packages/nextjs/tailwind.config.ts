import daisyui from "daisyui";
import type { Config } from "tailwindcss";

// Static import for daisyui

// Import DaisyUI specific types if available, or extend Tailwind's Config type
// A common approach is to let daisyui plugin augment the type implicitly, or define a custom type.
// For simplicity and common practice with daisyui, we often define the type inline or rely on the plugin
// to extend the type automatically when the plugin is included in the `plugins` array.

// However, the linter is complaining about the object literal. Let's explicitly type it with `any` first
// and then refine if necessary, or rely on Tailwind's structure which the plugin extends.
// A more robust way is to import DaisyConfig type if DaisyUI exposes it.

// Let's try relying on the plugin extending the type after importing daisyui.
// If the linter still complains, we might need a specific DaisyUI type import.

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-in-out",
        "scale-up": "scaleUp 0.5s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  daisyui: {
    themes: [
      {
        gdrive: {
          primary: "#2563EB", // Professional Blue
          secondary: "#4B5563", // Graphite Gray
          accent: "#93C5FD", // Light Blue Accent
          neutral: "#1F2937",
          "base-100": "#0F172A", // Darker Background
          "base-200": "#1E293B",
          "base-300": "#334155",
          info: "#3B82F6",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
    ],
  },
  plugins: [daisyui], // Use the imported plugin
} as Config & { daisyui: object }; // Explicitly cast to include daisyui

export default config;
