/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF9F6",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#16181D",
          secondary: "#525866",
          subtle: "#7E8695",
          border: "#E5E5DF",
          "border-hover": "#D3D2CA",
        },
        brand: {
          DEFAULT: "#1F3FBF",
          hover: "#173099",
          active: "#122475",
          tint: "#EEF2FF",
        },
        diff: {
          bg: "#FEF3C7",
          border: "#FDE68A",
        },
        feedback: {
          success: "#1B7340",
          "success-bg": "#EBF7EE",
          error: "#B92525",
          "error-bg": "#FDF2F2",
          warning: "#8A5A00",
          "warning-bg": "#FEF8EC",
        },
        neutral: {
          disabled: "#E5E5DF",
          "disabled-text": "#7E8695",
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      maxWidth: {
        prose: "70ch",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(22, 24, 29, 0.04)",
      },
    },
  },
  plugins: [],
};
