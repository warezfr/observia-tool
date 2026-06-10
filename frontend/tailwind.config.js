/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#8B5CF6',
          600: '#7C3AED',
        },
        secondary: '#06B6D4',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#F43F5E',
        slate: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
};
