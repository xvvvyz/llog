import * as React from 'react';

import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';

const stopPressPropagation = (event: GestureResponderEvent) => {
  event.stopPropagation();

  const nativeEvent = event.nativeEvent as {
    stopImmediatePropagation?: () => void;
    stopPropagation?: () => void;
  };

  nativeEvent.stopPropagation?.();
  nativeEvent.stopImmediatePropagation?.();
};

const composeHandler =
  (handler?: ((event: GestureResponderEvent) => void) | null) =>
  (event: GestureResponderEvent) => {
    stopPressPropagation(event);
    handler?.(event);
  };

const PressPropagationBoundary = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  PressableProps
>(
  (
    {
      accessible = false,
      focusable = false,
      onPress,
      onPressIn,
      onPressOut,
      onTouchCancel,
      onTouchEnd,
      onTouchStart,
      ...props
    },
    ref
  ) => (
    <Pressable
      ref={ref}
      accessible={accessible}
      focusable={focusable}
      onPress={composeHandler(onPress)}
      onPressIn={composeHandler(onPressIn)}
      onPressOut={composeHandler(onPressOut)}
      onTouchCancel={composeHandler(onTouchCancel)}
      onTouchEnd={composeHandler(onTouchEnd)}
      onTouchStart={composeHandler(onTouchStart)}
      {...props}
    />
  )
);

PressPropagationBoundary.displayName = 'PressPropagationBoundary';

export { PressPropagationBoundary };
