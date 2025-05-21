const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  plugins: [require('tailwindcss-animate')],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      borderWidth: {
        hairline: hairlineWidth(),
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        placeholder: 'hsl(var(--placeholder))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        gray: {
          lighter: 'hsl(var(--gray-lighter))',
          DEFAULT: 'hsl(var(--gray))',
          darker: 'hsl(var(--gray-darker))',
        },
        brown: {
          lighter: 'hsl(var(--brown-lighter))',
          DEFAULT: 'hsl(var(--brown))',
          darker: 'hsl(var(--brown-darker))',
        },
        amber: {
          lighter: 'hsl(var(--amber-lighter))',
          DEFAULT: 'hsl(var(--amber))',
          darker: 'hsl(var(--amber-darker))',
        },
        yellow: {
          lighter: 'hsl(var(--yellow-lighter))',
          DEFAULT: 'hsl(var(--yellow))',
          darker: 'hsl(var(--yellow-darker))',
        },
        green: {
          lighter: 'hsl(var(--green-lighter))',
          DEFAULT: 'hsl(var(--green))',
          darker: 'hsl(var(--green-darker))',
        },
        cyan: {
          lighter: 'hsl(var(--cyan-lighter))',
          DEFAULT: 'hsl(var(--cyan))',
          darker: 'hsl(var(--cyan-darker))',
        },
        blue: {
          lighter: 'hsl(var(--blue-lighter))',
          DEFAULT: 'hsl(var(--blue))',
          darker: 'hsl(var(--blue-darker))',
        },
        indigo: {
          lighter: 'hsl(var(--indigo-lighter))',
          DEFAULT: 'hsl(var(--indigo))',
          darker: 'hsl(var(--indigo-darker))',
        },
        purple: {
          lighter: 'hsl(var(--purple-lighter))',
          DEFAULT: 'hsl(var(--purple))',
          darker: 'hsl(var(--purple-darker))',
        },
        pink: {
          lighter: 'hsl(var(--pink-lighter))',
          DEFAULT: 'hsl(var(--pink))',
          darker: 'hsl(var(--pink-darker))',
        },
        red: {
          lighter: 'hsl(var(--red-lighter))',
          DEFAULT: 'hsl(var(--red))',
          darker: 'hsl(var(--red-darker))',
        },
        orange: {
          lighter: 'hsl(var(--orange-lighter))',
          DEFAULT: 'hsl(var(--orange))',
          darker: 'hsl(var(--orange-darker))',
        },
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
};
