import { Platform } from 'react-native';

export const nativePointerEvents = {
  boxNone:
    Platform.OS === 'web'
      ? undefined
      : ({ pointerEvents: 'box-none' } as const),
  none:
    Platform.OS === 'web' ? undefined : ({ pointerEvents: 'none' } as const),
};
