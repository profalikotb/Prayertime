import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        emerald: 'rgb(var(--emerald) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        night: 'rgb(var(--night) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Cairo Variable"', 'Cairo', 'system-ui', 'sans-serif'],
        display: ['Amiri', '"Cairo Variable"', 'serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
} satisfies Config;
