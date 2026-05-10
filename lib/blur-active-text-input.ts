import { Keyboard, Platform } from 'react-native';

export const blurActiveTextInput = () => {
  if (Platform.OS !== 'web') {
    Keyboard.dismiss();
    return;
  }

  if (typeof document === 'undefined') return;
  const activeElement = document.activeElement as HTMLElement | null;
  const activeTagName = activeElement?.tagName;

  const isTextInputActive =
    activeTagName === 'TEXTAREA' ||
    activeTagName === 'INPUT' ||
    !!activeElement?.isContentEditable;

  if (isTextInputActive) activeElement?.blur();
};
