import { useBreakpoints } from '@/hooks/use-breakpoints';

export const useHeaderHeight = () => (useBreakpoints().md ? 70 : 56);
