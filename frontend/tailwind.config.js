/** @type {import('tailwindcss').Config} */
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: withAlpha('--app'),
        surface: withAlpha('--surface'),
        elevated: withAlpha('--elevated'),
        border: withAlpha('--border'),
        'border-subtle': withAlpha('--border-subtle'),
        fg: {
          DEFAULT: withAlpha('--fg'),
          secondary: withAlpha('--fg-secondary'),
          muted: withAlpha('--fg-muted'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          hover: withAlpha('--accent-hover'),
          soft: withAlpha('--accent-soft'),
          ring: withAlpha('--accent-ring'),
          fg: withAlpha('--accent-fg'),
        },
        success: withAlpha('--success'),
        warning: withAlpha('--warning'),
        error: withAlpha('--error'),
        info: withAlpha('--info'),
        severity: {
          critical: withAlpha('--sev-critical'),
          high: withAlpha('--sev-high'),
          medium: withAlpha('--sev-medium'),
          low: withAlpha('--sev-low'),
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
      },
      fontFamily: {
        sans: ['Geist Variable', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono Variable', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.02em',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--shadow) / 0.04), 0 1px 3px rgb(var(--shadow) / 0.06)',
        card: '0 1px 3px rgb(var(--shadow) / 0.05), 0 8px 24px rgb(var(--shadow) / 0.06)',
        pop: '0 4px 16px rgb(var(--shadow) / 0.08), 0 12px 40px rgb(var(--shadow) / 0.1)',
        glow: '0 0 0 1px rgb(var(--accent-ring) / 0.5), 0 4px 20px rgb(var(--accent) / 0.15)',
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
        slideIn: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        slideDown: 'slideDown 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
