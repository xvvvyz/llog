import { Platform } from 'react-native';

export const isPwa = (): boolean => {
  if (Platform.OS !== 'web') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
};
