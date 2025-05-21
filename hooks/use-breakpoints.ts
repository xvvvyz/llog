import { useWindowDimensions } from 'react-native';
import tailwindConfig from '../tailwind.config.js';

const breakpoints = Object.entries(
  tailwindConfig.theme?.extend?.screens ?? {}
).reduce(
  (acc, [key, value]) => ({ ...acc, [key]: parseInt(value) }),
  {} as Record<string, number>
);

export const useBreakpoints = () => {
  const { width } = useWindowDimensions();

  return {
    xs: width >= breakpoints.xs,
    sm: width >= breakpoints.sm,
    md: width >= breakpoints.md,
    lg: width >= breakpoints.lg,
    xl: width >= breakpoints.xl,
    '2xl': width >= breakpoints['2xl'],
  };
};
