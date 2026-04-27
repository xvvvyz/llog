import { Platform } from 'react-native';

export const isTouchWeb = (): boolean => {
  if (Platform.OS !== 'web') return false;

  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
};
