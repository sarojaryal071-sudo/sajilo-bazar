/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          from: 'var(--color-brand-from)',
          to: 'var(--color-brand-to)',
          solid: 'var(--color-brand-solid)',
          contrast: 'var(--color-brand-contrast)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
          raised: 'var(--color-surface-raised)',
        },
        border: 'var(--color-border)',
        glass: {
          surface: 'var(--color-glass-surface)',
          border: 'var(--color-glass-border)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          onBrand: 'var(--color-text-on-brand)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        resting: 'var(--shadow-resting)',
        raised: 'var(--shadow-raised)',
        'neu-card': 'var(--shadow-neu-card)',
        'neu-inset': 'var(--shadow-neu-inset)',
        'neu-button': 'var(--shadow-neu-button)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg, var(--color-brand-from), var(--color-brand-to))',
      },
    },
  },
  plugins: [],
};
