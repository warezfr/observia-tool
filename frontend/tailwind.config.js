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
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 3px rgb(var(--shadow) / 0.08)',
        card: '0 1px 2px rgb(var(--shadow) / 0.04), 0 4px 12px rgb(var(--shadow) / 0.08)',
        pop: '0 8px 24px rgb(var(--shadow) / 0.12), 0 2px 6px rgb(var(--shadow) / 0.08)',
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
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
