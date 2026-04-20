export const BREAKPOINTS = {
  '2xs': '320px',
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const BREAKPOINT_VALUES = Object.fromEntries(
  Object.entries(BREAKPOINTS).map(([key, value]) => [key, parseInt(value, 10)])
) as Record<keyof typeof BREAKPOINTS, number>;

export const RADII = {
  DEFAULT: '0.375rem',
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  '4xl': '2rem',
} as const;
