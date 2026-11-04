/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          text: "var(--color-sidebar-text)",
          muted: "var(--color-sidebar-muted)",
        },
        canvas: "var(--color-canvas)",
        panel: "var(--color-panel)",
        page: "var(--color-page)",
        surface: "var(--color-surface)",
        inset: "var(--color-inset)",
        hairline: "var(--color-hairline)",
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-muted)",
          subtle: "#7E8695",
          border: "var(--color-hairline)",
          "border-hover": "rgba(22, 24, 29, 0.20)",
        },
        brand: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "#142A82",
          tint: "var(--color-accent-tint)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          tint: "var(--color-accent-tint)",
        },
        feedback: {
          success: "var(--color-success)",
          error: "var(--color-error)",
          warning: "var(--color-warning)",
        },
        diff: {
          bg: "#FEF3C7",
          border: "#FDE68A",
        },
      },
      borderRadius: {
        control: "6px",
        panel: "12px",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        md: ['17px', { lineHeight: '28px' }],
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['48px', { lineHeight: '56px' }],
      },
      maxWidth: {
        prose: "68ch",
        document: "68ch",
      },
      borderRadius: {
        control: "6px",
        panel: "10px",
        DEFAULT: "6px",
        sm: "6px",
        md: "6px",
        lg: "10px",
        xl: "10px",
      },
      boxShadow: {
        none: "none",
        menu: "0 4px 12px rgba(22, 24, 29, 0.08)",
        dialog: "0 8px 24px rgba(22, 24, 29, 0.12)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: {
        micro: "120ms",
        ui: "200ms",
        panel: "320ms",
        signature: "600ms",
      },
    },
  },
  plugins: [],
};
