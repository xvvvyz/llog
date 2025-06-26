import { Platform } from 'react-native';

import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
} from 'react-native-reanimated';

export const animation = (
  type:
    | typeof FadeIn
    | typeof FadeInDown
    | typeof FadeInUp
    | typeof FadeOut
    | typeof FadeOutDown
    | typeof FadeOutUp
) =>
  Platform.select({
    // https://github.com/facebook/react-native/issues/49077
    android: undefined,
    default: type.duration(150),
  });
