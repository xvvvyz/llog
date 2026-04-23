import * as React from 'react';

import {
  Keyboard,
  Platform,
  type KeyboardEvent as RNKeyboardEvent,
} from 'react-native';

const VIRTUAL_KEYBOARD_MIN_HEIGHT = 80;

const isTextEntryFocused = () => {
  if (typeof document === 'undefined') return false;

  const activeElement = document.activeElement as HTMLElement | null;
  const tagName = activeElement?.tagName;

  return (
    tagName === 'TEXTAREA' ||
    tagName === 'INPUT' ||
    !!activeElement?.isContentEditable
  );
};

const hasKeyboardHeight = (height?: number | null) =>
  typeof height === 'number' && height >= VIRTUAL_KEYBOARD_MIN_HEIGHT;

const getNativeKeyboardVisible = () =>
  Keyboard.isVisible() && hasKeyboardHeight(Keyboard.metrics()?.height);

export const useVirtualKeyboardVisible = (enabled: boolean) => {
  const baselineHeightRef = React.useRef(0);
  const baselineWidthRef = React.useRef(0);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const update = () => {
        if (typeof window === 'undefined') return;

        const visualViewport = window.visualViewport;

        const viewportHeight = Math.round(
          visualViewport?.height ?? window.innerHeight
        );

        const viewportWidth = Math.round(
          visualViewport?.width ?? window.innerWidth
        );

        const textEntryFocused = isTextEntryFocused();

        if (
          baselineWidthRef.current &&
          baselineWidthRef.current !== viewportWidth
        ) {
          baselineHeightRef.current = 0;
        }

        baselineWidthRef.current = viewportWidth;

        if (!enabled || !textEntryFocused) {
          baselineHeightRef.current = Math.max(
            baselineHeightRef.current,
            viewportHeight
          );

          setIsVisible(false);
          return;
        }

        if (!baselineHeightRef.current) {
          baselineHeightRef.current = viewportHeight;
        }

        const nextIsVisible =
          baselineHeightRef.current - viewportHeight >=
          VIRTUAL_KEYBOARD_MIN_HEIGHT;

        if (!nextIsVisible) {
          baselineHeightRef.current = Math.max(
            baselineHeightRef.current,
            viewportHeight
          );
        }

        setIsVisible(nextIsVisible);
      };

      update();

      const visualViewport = window.visualViewport;
      visualViewport?.addEventListener('resize', update);
      visualViewport?.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);
      window.addEventListener('focusin', update);
      window.addEventListener('focusout', update);

      return () => {
        visualViewport?.removeEventListener('resize', update);
        visualViewport?.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
        window.removeEventListener('focusin', update);
        window.removeEventListener('focusout', update);
      };
    }

    if (!enabled) {
      setIsVisible(false);
      return;
    }

    const updateFromShowEvent = (event: RNKeyboardEvent) => {
      setIsVisible(
        hasKeyboardHeight(event.endCoordinates?.height) ||
          getNativeKeyboardVisible()
      );
    };

    const updateFromHideEvent = () => setIsVisible(false);

    setIsVisible(getNativeKeyboardVisible());

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      updateFromShowEvent
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      updateFromHideEvent
    );

    const changeSubscription =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', updateFromShowEvent)
        : undefined;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      changeSubscription?.remove();
    };
  }, [enabled]);

  return enabled && isVisible;
};
