/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['var(--font-montserrat)'],
      },
      colors: {
        'day-bg': 'var(--day-bg)',
        'day-accent': 'var(--day-accent)',
        'night-bg': 'var(--night-bg)',
        'night-accent': 'var(--night-accent)',
        'prompt': 'var(--prompt)',
        'app-bg': 'var(--app-bg)',
        'app-text': 'var(--app-text)',
        'app-form-bg': 'var(--app-form-bg)',
        'app-input-bg': 'var(--app-input-bg)',
        'app-input-border': 'var(--app-input-border)',
        'app-divider': 'var(--app-divider)',
        'app-primary': 'var(--app-primary)',
        'app-secondary': 'var(--app-secondary)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-out': 'fadeInOut 3s ease-in-out',
        'pulse': 'pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInOut: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '10%': { opacity: '1', transform: 'translateY(0)' },
          '90%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
} 