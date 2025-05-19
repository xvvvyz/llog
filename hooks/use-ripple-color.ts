import { useColorScheme } from '@/hooks/use-color-scheme';
import { RIPPLE } from '@/theme/ripple';

export const useRippleColor = (version: 'default' | 'inverse' = 'default') => {
  const colorScheme = useColorScheme();
  return RIPPLE[colorScheme][version];
};
