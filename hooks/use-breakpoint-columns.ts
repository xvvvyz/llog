import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useMemo } from 'react';

export const useGridColumns = (columns: number[]) => {
  const breakpoints = useBreakpoints();

  return useMemo(() => {
    if (breakpoints['2xl'] && columns[6]) return columns[6];
    if (breakpoints.xl && columns[5]) return columns[5];
    if (breakpoints.lg && columns[4]) return columns[4];
    if (breakpoints.md && columns[3]) return columns[3];
    if (breakpoints.sm && columns[2]) return columns[2];
    if (breakpoints.xs && columns[1]) return columns[1];
    if (breakpoints['2xs'] && columns[0]) return columns[0];
    return 1;
  }, [breakpoints, columns]);
};
