// reference: https://github.com/tailwindlabs/tailwindcss/blob/master/stubs/defaultConfig.stub.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  plugins: [require('@headlessui/tailwindcss', '@tailwindcss/forms')],
  theme: {
    borderRadius: {
      DEFAULT: 'var(--radius-default)',
      full: '50%',
    },
    colors: {
      'accent-1': 'var(--color-accent-1)',
      'accent-2': 'var(--color-accent-2)',
      'alpha-bg-1': 'var(--color-alpha-bg-1)',
      'alpha-bg-2': 'var(--color-alpha-bg-2)',
      'alpha-bg-3': 'var(--color-alpha-bg-3)',
      'alpha-fg-1': 'var(--color-alpha-fg-1)',
      'alpha-fg-2': 'var(--color-alpha-fg-2)',
      'alpha-fg-3': 'var(--color-alpha-fg-3)',
      'bg-1': 'var(--color-bg-1)',
      'bg-2': 'var(--color-bg-2)',
      'fg-1': 'var(--color-fg-1)',
      'fg-2': 'var(--color-fg-2)',
      'red-1': 'var(--color-red-1)',
      'red-2': 'var(--color-red-2)',
      transparent: 'transparent',
    },
    screens: {
      sm: '32rem',
      xs: '25rem',
    },
  },
};
