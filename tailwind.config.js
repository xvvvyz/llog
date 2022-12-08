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
      'alpha-1': 'var(--color-alpha-1)',
      'alpha-2': 'var(--color-alpha-2)',
      'alpha-3': 'var(--color-alpha-3)',
      'bg-1': 'var(--color-bg-1)',
      'bg-2': 'var(--color-bg-2)',
      'bg-3': 'var(--color-bg-3)',
      'fg-1': 'var(--color-fg-1)',
      'fg-2': 'var(--color-fg-2)',
      'fg-3': 'var(--color-fg-3)',
      'red-1': 'var(--color-red-1)',
      'red-2': 'var(--color-red-2)',
      transparent: 'transparent',
    },
    screens: {
      xs: '425px',
    },
  },
};
