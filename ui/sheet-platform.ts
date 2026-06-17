import * as React from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';
import type * as sheetPlatformTypes from '@/ui/sheet-platform-types';

export const useSheetPlatformLayout = ({
  bottomInset,
  keyboardAvoidingEnabled = true,
  open,
  windowHeight,
}: sheetPlatformTypes.SheetPlatformLayoutOptions): sheetPlatformTypes.SheetPlatformLayout => {
  const keyboardHeight = useNativeSheetKeyboardHeight(
    open && keyboardAvoidingEnabled
  );

  return {
    bottomSpacerStyle: { height: bottomInset },
    keyboardBackdropStyle:
      Platform.OS === 'ios' && keyboardHeight > 0
        ? { height: keyboardHeight }
        : undefined,
    viewportHeight: Math.max(1, windowHeight - keyboardHeight),
  };
};

const useNativeSheetKeyboardHeight = (enabled: boolean) => {
  const [keyboardHeight, setKeyboardHeight] = React.useState(() =>
    enabled ? (Keyboard.metrics()?.height ?? 0) : 0
  );

  React.useEffect(() => {
    if (!enabled) {
      setKeyboardHeight(0);
      return;
    }

    const updateHeight = (event?: KeyboardEvent) => {
      setKeyboardHeight(event?.endCoordinates?.height ?? 0);
    };

    const clearHeight = () => setKeyboardHeight(0);
    setKeyboardHeight(Keyboard.metrics()?.height ?? 0);

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      updateHeight
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      clearHeight
    );

    const changeSubscription =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', updateHeight)
        : undefined;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      changeSubscription?.remove();
    };
  }, [enabled]);

  return keyboardHeight;
};
