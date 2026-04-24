import * as mediaLightboxAnimation from '@/features/media/lib/lightbox-animation';
import * as React from 'react';
import { GestureResponderEvent, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

import {
  cancelAnimation,
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type WebTouchState = {
  isDragging: boolean;
  lastTime: number;
  lastY: number;
  startX: number;
  startY: number;
  velocityY: number;
};

export const useMediaLightboxDismiss = ({
  animatedValues,
  dismissThreshold,
  dragFadeDistance,
  isClosing,
  isModalVisible,
  isVisible,
  onAnimatedRequestClose,
}: {
  animatedValues: mediaLightboxAnimation.MediaLightboxAnimatedValues;
  dismissThreshold: number;
  dragFadeDistance: number;
  isClosing: boolean;
  isModalVisible: boolean;
  isVisible: boolean;
  onAnimatedRequestClose: (
    direction?: mediaLightboxAnimation.DismissDirection
  ) => void;
}) => {
  const [isDismissLocked, setIsDismissLocked] = React.useState(false);

  const [isDismissGestureActive, setIsDismissGestureActive] =
    React.useState(false);

  const webTouchStateRef = React.useRef<WebTouchState | null>(null);
  const shouldSkipGestureReset = useSharedValue(false);

  const { backgroundOpacity, mediaOpacity, overlayOpacity, translateY } =
    animatedValues;

  const updateDismissGestureActive = React.useCallback((isActive: boolean) => {
    setIsDismissGestureActive(isActive);
  }, []);

  const resetDismissPosition = React.useCallback(() => {
    mediaLightboxAnimation.resetDismissAnimation(animatedValues);
  }, [animatedValues]);

  React.useEffect(() => {
    if (isModalVisible) return;
    setIsDismissLocked(false);
    setIsDismissGestureActive(false);
    webTouchStateRef.current = null;
  }, [isModalVisible]);

  React.useEffect(() => {
    if (!isVisible) return;
    setIsDismissLocked(false);
    setIsDismissGestureActive(false);
    webTouchStateRef.current = null;
  }, [isVisible]);

  const dismissGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(Platform.OS !== 'web' && !isClosing && !isDismissLocked)
        .activeOffsetY([
          -mediaLightboxAnimation.DISMISS_ACTIVE_OFFSET_Y,
          mediaLightboxAnimation.DISMISS_ACTIVE_OFFSET_Y,
        ])
        .failOffsetX([
          -mediaLightboxAnimation.DISMISS_FAIL_OFFSET_X,
          mediaLightboxAnimation.DISMISS_FAIL_OFFSET_X,
        ])
        .onBegin(() => {
          'worklet';
          shouldSkipGestureReset.value = false;
        })
        .onStart(() => {
          'worklet';
          cancelAnimation(overlayOpacity);

          overlayOpacity.value = withTiming(0, {
            duration: mediaLightboxAnimation.DISMISS_OVERLAY_FADE_DURATION_MS,
            easing: Easing.linear,
          });

          runOnJS(updateDismissGestureActive)(true);
        })
        .onUpdate((event) => {
          'worklet';
          translateY.value = event.translationY;

          backgroundOpacity.value = mediaLightboxAnimation.getDragChromeOpacity(
            event.translationY,
            dragFadeDistance
          );

          mediaOpacity.value = mediaLightboxAnimation.getDragMediaOpacity(
            event.translationY,
            dragFadeDistance
          );
        })
        .onEnd((event) => {
          'worklet';

          const direction: mediaLightboxAnimation.DismissDirection =
            event.translationY < 0 ? -1 : 1;

          const shouldDismiss =
            Math.abs(event.translationY) >= dismissThreshold ||
            Math.abs(event.velocityY) >=
              mediaLightboxAnimation.DISMISS_VELOCITY_THRESHOLD;

          if (shouldDismiss) {
            shouldSkipGestureReset.value = true;
            runOnJS(onAnimatedRequestClose)(direction);
            return;
          }

          shouldSkipGestureReset.value = true;
          runOnJS(updateDismissGestureActive)(false);
          mediaLightboxAnimation.resetDismissAnimation(animatedValues);
        })
        .onFinalize(() => {
          'worklet';

          if (shouldSkipGestureReset.value) {
            shouldSkipGestureReset.value = false;
            return;
          }

          runOnJS(updateDismissGestureActive)(false);

          if (
            isClosing ||
            mediaLightboxAnimation.isDismissAnimationSettled(animatedValues)
          ) {
            return;
          }

          mediaLightboxAnimation.resetDismissAnimation(animatedValues);
        }),
    [
      animatedValues,
      backgroundOpacity,
      dismissThreshold,
      dragFadeDistance,
      isClosing,
      isDismissLocked,
      mediaOpacity,
      onAnimatedRequestClose,
      overlayOpacity,
      shouldSkipGestureReset,
      translateY,
      updateDismissGestureActive,
    ]
  );

  const handleWebTouchStart = React.useCallback(
    (event: GestureResponderEvent) => {
      if (Platform.OS !== 'web' || isClosing || isDismissLocked) return;
      const touch = event.nativeEvent.touches[0];

      if (!touch || event.nativeEvent.touches.length !== 1) {
        webTouchStateRef.current = null;
        return;
      }

      webTouchStateRef.current = {
        isDragging: false,
        lastTime: Date.now(),
        lastY: touch.pageY,
        startX: touch.pageX,
        startY: touch.pageY,
        velocityY: 0,
      };
    },
    [isClosing, isDismissLocked]
  );

  const handleWebTouchMove = React.useCallback(
    (event: GestureResponderEvent) => {
      if (Platform.OS !== 'web') return;
      const touchState = webTouchStateRef.current;
      const touch = event.nativeEvent.touches[0];

      if (!touchState || !touch || event.nativeEvent.touches.length !== 1) {
        webTouchStateRef.current = null;
        return;
      }

      const translationX = touch.pageX - touchState.startX;
      const translationY = touch.pageY - touchState.startY;

      if (!touchState.isDragging) {
        if (
          Math.abs(translationX) >
            mediaLightboxAnimation.DISMISS_FAIL_OFFSET_X &&
          Math.abs(translationX) > Math.abs(translationY)
        ) {
          webTouchStateRef.current = null;
          return;
        }

        if (
          Math.abs(translationY) <
            mediaLightboxAnimation.DISMISS_ACTIVE_OFFSET_Y ||
          Math.abs(translationY) <= Math.abs(translationX)
        ) {
          return;
        }

        touchState.isDragging = true;
        cancelAnimation(overlayOpacity);

        overlayOpacity.value = withTiming(0, {
          duration: mediaLightboxAnimation.DISMISS_OVERLAY_FADE_DURATION_MS,
          easing: Easing.linear,
        });

        updateDismissGestureActive(true);
      }

      event.preventDefault();
      const now = Date.now();
      const deltaTime = Math.max(now - touchState.lastTime, 1);

      touchState.velocityY =
        ((touch.pageY - touchState.lastY) / deltaTime) * 1000;

      touchState.lastTime = now;
      touchState.lastY = touch.pageY;
      translateY.value = translationY;

      backgroundOpacity.value = mediaLightboxAnimation.getDragChromeOpacity(
        translationY,
        dragFadeDistance
      );

      mediaOpacity.value = mediaLightboxAnimation.getDragMediaOpacity(
        translationY,
        dragFadeDistance
      );
    },
    [
      backgroundOpacity,
      dragFadeDistance,
      mediaOpacity,
      overlayOpacity,
      translateY,
      updateDismissGestureActive,
    ]
  );

  const handleWebTouchEnd = React.useCallback(() => {
    const touchState = webTouchStateRef.current;
    webTouchStateRef.current = null;
    if (!touchState?.isDragging) return;
    const translationY = touchState.lastY - touchState.startY;

    const direction: mediaLightboxAnimation.DismissDirection =
      translationY < 0 ? -1 : 1;

    const shouldDismiss =
      Math.abs(translationY) >= dismissThreshold ||
      Math.abs(touchState.velocityY) >=
        mediaLightboxAnimation.DISMISS_VELOCITY_THRESHOLD;

    if (shouldDismiss) {
      onAnimatedRequestClose(direction);
      return;
    }

    updateDismissGestureActive(false);
    resetDismissPosition();
  }, [
    dismissThreshold,
    onAnimatedRequestClose,
    resetDismissPosition,
    updateDismissGestureActive,
  ]);

  const handleWebTouchCancel = React.useCallback(() => {
    const wasDragging = webTouchStateRef.current?.isDragging ?? false;
    webTouchStateRef.current = null;
    if (!wasDragging) return;
    updateDismissGestureActive(false);
    resetDismissPosition();
  }, [resetDismissPosition, updateDismissGestureActive]);

  const webTouchHandlers = React.useMemo(
    () => ({
      onTouchCancel: Platform.OS === 'web' ? handleWebTouchCancel : undefined,
      onTouchEnd: Platform.OS === 'web' ? handleWebTouchEnd : undefined,
      onTouchMove: Platform.OS === 'web' ? handleWebTouchMove : undefined,
      onTouchStart: Platform.OS === 'web' ? handleWebTouchStart : undefined,
    }),
    [
      handleWebTouchCancel,
      handleWebTouchEnd,
      handleWebTouchMove,
      handleWebTouchStart,
    ]
  );

  return {
    dismissGesture,
    isDismissGestureActive,
    setIsDismissLocked,
    webTouchHandlers,
  };
};
