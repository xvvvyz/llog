import { BREAKPOINT_VALUES } from '@/theme/tokens';
import * as React from 'react';
import { useWindowDimensions } from 'react-native';

export const useBreakpoints = () => {
  const { width } = useWindowDimensions();

  return React.useMemo(
    () => ({
      '2xs': width >= BREAKPOINT_VALUES['2xs'],
      xs: width >= BREAKPOINT_VALUES.xs,
      sm: width >= BREAKPOINT_VALUES.sm,
      md: width >= BREAKPOINT_VALUES.md,
      lg: width >= BREAKPOINT_VALUES.lg,
      xl: width >= BREAKPOINT_VALUES.xl,
      '2xl': width >= BREAKPOINT_VALUES['2xl'],
    }),
    [width]
  );
};
