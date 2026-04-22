import { Platform } from 'react-native';

const isStandaloneNavigator = (
  value: Navigator
): value is Navigator & { standalone?: boolean } => 'standalone' in value;

export const isPwa = (): boolean => {
  if (Platform.OS !== 'web') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (isStandaloneNavigator(navigator) && navigator.standalone === true)
  );
};
