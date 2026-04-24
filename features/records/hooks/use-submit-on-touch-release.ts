import { Button } from '@/ui/button';
import * as React from 'react';
import { Platform } from 'react-native';

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;
type ButtonTouchEvent = Parameters<NonNullable<ButtonProps['onTouchStart']>>[0];
type TouchPoint = { x: number; y: number };
type TouchStart = TouchPoint & { enabled: boolean };
const TOUCH_CANCEL_DISTANCE = 16;
const SKIP_PRESS_RESET_MS = 500;

const readTouchPoint = (event: ButtonTouchEvent): TouchPoint | null => {
  const nativeEvent = event.nativeEvent as {
    changedTouches?: Array<{
      clientX?: unknown;
      clientY?: unknown;
      pageX?: unknown;
      pageY?: unknown;
    }>;
    pageX?: unknown;
    pageY?: unknown;
    touches?: Array<{
      clientX?: unknown;
      clientY?: unknown;
      pageX?: unknown;
      pageY?: unknown;
    }>;
  };

  const touch = nativeEvent.changedTouches?.[0] ?? nativeEvent.touches?.[0];
  const x = touch?.clientX ?? touch?.pageX ?? nativeEvent.pageX;
  const y = touch?.clientY ?? touch?.pageY ?? nativeEvent.pageY;
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

const preventFollowUpClick = (event: ButtonTouchEvent) => {
  event.preventDefault?.();
  event.stopPropagation?.();

  const nativeEvent = event.nativeEvent as {
    preventDefault?: () => void;
    stopPropagation?: () => void;
  };

  nativeEvent.preventDefault?.();
  nativeEvent.stopPropagation?.();
};

export const useSubmitOnTouchRelease = ({
  enabled,
  onSubmit,
}: {
  enabled: boolean;
  onSubmit: () => void | Promise<void>;
}) => {
  const skipNextPressRef = React.useRef(false);

  const skipPressResetTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const touchStartRef = React.useRef<TouchStart | null>(null);

  const clearSkipPressResetTimeout = React.useCallback(() => {
    if (!skipPressResetTimeoutRef.current) return;
    clearTimeout(skipPressResetTimeoutRef.current);
    skipPressResetTimeoutRef.current = null;
  }, []);

  React.useEffect(
    () => clearSkipPressResetTimeout,
    [clearSkipPressResetTimeout]
  );

  const markNextPressHandled = React.useCallback(() => {
    clearSkipPressResetTimeout();
    skipNextPressRef.current = true;

    skipPressResetTimeoutRef.current = setTimeout(() => {
      skipNextPressRef.current = false;
      skipPressResetTimeoutRef.current = null;
    }, SKIP_PRESS_RESET_MS);
  }, [clearSkipPressResetTimeout]);

  const handlePress = React.useCallback(() => {
    if (skipNextPressRef.current) {
      skipNextPressRef.current = false;
      clearSkipPressResetTimeout();
      return;
    }

    void onSubmit();
  }, [clearSkipPressResetTimeout, onSubmit]);

  const handleTouchStart = React.useCallback(
    (event: ButtonTouchEvent) => {
      const point = readTouchPoint(event);
      touchStartRef.current = point ? { ...point, enabled } : null;
    },
    [enabled]
  );

  const handleTouchEnd = React.useCallback(
    (event: ButtonTouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start?.enabled) return;
      const end = readTouchPoint(event) ?? start;
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      if (distance > TOUCH_CANCEL_DISTANCE) return;
      preventFollowUpClick(event);
      markNextPressHandled();
      void onSubmit();
    },
    [markNextPressHandled, onSubmit]
  );

  const handleTouchCancel = React.useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return {
    onPress: handlePress,
    onTouchCancel: Platform.OS === 'web' ? handleTouchCancel : undefined,
    onTouchEnd: Platform.OS === 'web' ? handleTouchEnd : undefined,
    onTouchStart: Platform.OS === 'web' ? handleTouchStart : undefined,
  } satisfies Pick<
    ButtonProps,
    'onPress' | 'onTouchCancel' | 'onTouchEnd' | 'onTouchStart'
  >;
};
