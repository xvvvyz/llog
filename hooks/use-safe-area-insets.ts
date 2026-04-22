import { isPwa } from '@/lib/pwa';
import { useSafeAreaInsets as _useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeAreaInsets() {
  const insets = _useSafeAreaInsets();
  if (isPwa()) return { ...insets, bottom: 28 };
  return insets;
}
