import { ClassValue, clsx } from 'clsx';
import { Alert as NativeAlert, Platform } from 'react-native';
import { twMerge } from 'tailwind-merge';

import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
} from 'react-native-reanimated';

export const alert = ({
  message,
  title,
}: {
  message: string;
  title: string;
}) => {
  Platform.select({
    default: NativeAlert.alert(title, message),
    web: window.alert(message),
  });
};

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

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
