import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        wine: "hsl(var(--wine))",
        "wine-deep": "hsl(var(--wine-deep))",
        "wine-soft": "hsl(var(--wine-soft))",
        gold: "hsl(var(--gold))",
        "gold-soft": "hsl(var(--gold-soft))",
        "gold-2": "hsl(var(--gold-2))",
        "gold-deep": "hsl(var(--gold-deep))",
        ink: "hsl(var(--ink))",
        "ink-muted": "hsl(var(--ink-muted))",
        "ink-muted-2": "hsl(var(--ink-muted-2))",
        "ink-subtle": "hsl(var(--ink-subtle))",
        "on-dark": "hsl(var(--on-dark))",
        "on-dark-muted": "hsl(var(--on-dark-muted))",
        "on-dark-subtle": "hsl(var(--on-dark-subtle))",
        cream: "hsl(var(--cream))",
        "cream-2": "hsl(var(--cream-2))",
        line: "hsl(var(--line))",
        "line-2": "hsl(var(--line-2))",
        panel: "hsl(var(--panel))",
        "panel-soft": "hsl(var(--panel-soft))",
        "panel-deep": "hsl(var(--panel-deep))",
        "panel-line": "hsl(var(--panel-line))",
        danger: "hsl(var(--danger))",
        "danger-deep": "hsl(var(--danger-deep))",
        "danger-soft": "hsl(var(--danger-soft))",
        "danger-line": "hsl(var(--danger-line))",
        sage: "hsl(var(--sage))",
        "sage-deep": "hsl(var(--sage-deep))",
        "sage-soft": "hsl(var(--sage-soft))",
        "sage-line": "hsl(var(--sage-line))",
        info: "hsl(var(--info))",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
