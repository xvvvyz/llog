import { Platform } from 'react-native';

// used to temporarily disable animations on android
// https://github.com/facebook/react-native/issues/49077
export const noAndroid = <T>(value: T) =>
  Platform.select({ android: undefined, default: value });
