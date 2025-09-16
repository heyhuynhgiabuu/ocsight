/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "IBM Plex Mono",
          "Fira Code",
          "SF Mono",
          "Monaco",
          "Cascadia Code",
          "Roboto Mono",
          "Consolas",
          "Courier New",
          "monospace",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      borderRadius: {
        none: "0",
      },
      colors: {
        border: "rgb(var(--color-border))",
        background: "rgb(var(--color-background))",
        foreground: "rgb(var(--color-foreground))",
        muted: "rgb(var(--color-muted))",
        "muted-foreground": "rgb(var(--color-muted-foreground))",
        primary: "rgb(var(--color-primary))",
        "primary-foreground": "rgb(var(--color-primary-foreground))",
        secondary: "rgb(var(--color-secondary))",
        "secondary-foreground": "rgb(var(--color-secondary-foreground))",
        accent: "rgb(var(--color-accent))",
        "accent-foreground": "rgb(var(--color-accent-foreground))",
        destructive: "rgb(var(--color-destructive))",
        "destructive-foreground": "rgb(var(--color-destructive-foreground))",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
