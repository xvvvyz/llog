import * as React from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import * as webSheetDrag from '@/ui/sheet-drag-web';
import type { SheetDragMetrics } from '@/ui/sheet-drag-metrics';
import type * as sheetDragContext from '@/ui/sheet-drag-context';
import * as sheetDragConstants from '@/ui/sheet-drag-constants';
import * as sheetDragMetrics from '@/ui/sheet-drag-metrics';

import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type SheetDragBehaviorOptions = SheetDragMetrics & {
  isTopSheet: boolean;
  isWeb: boolean;
  onCloseAnimationStart?: () => void;
  onDismiss: () => void;
  open: boolean;
};

export const useSheetDragBehavior = ({
  dismissThreshold,
  exitTranslation,
  isTopSheet,
  isWeb,
  onCloseAnimationStart,
  onDismiss,
  open,
  translateY,
}: SheetDragBehaviorOptions) => {
  const blockedScrollableIdsRef = React.useRef(new Set<string>());
  const closeCompletionCallbacksRef = React.useRef(new Set<() => void>());

  const closeCompletionTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const dragLockIdsRef = React.useRef(new Set<string>());

  const webTouchStateRef = React.useRef<webSheetDrag.WebTouchState | null>(
    null
  );

  const [canDragFromScrollableContent, setCanDragFromScrollableContent] =
    React.useState(true);

  const [isSheetDragLocked, setIsSheetDragLocked] = React.useState(false);
  const canDragFromScrollableContentValue = useSharedValue(true);
  const dragLockCount = useSharedValue(0);
  const isDragClosing = useSharedValue(false);
  const touchStartedInHandle = useSharedValue(false);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  // The shared values gate the native gesture on the UI thread; the React
  // state mirrors are only read by the web touch handlers. Setting state on
  // native would re-render the sheet mid-touch — recreating the dismiss
  // gesture under an active scroll cancels the text input's own scroll
  // recognizer, which then degrades the drag into a focusing tap.
  const updateScrollableDragState = React.useCallback(
    (canDrag: boolean) => {
      canDragFromScrollableContentValue.value = canDrag;
      if (isWeb) setCanDragFromScrollableContent(canDrag);
    },
    [canDragFromScrollableContentValue, isWeb]
  );

  const setScrollableAtTop = React.useCallback(
    (id: string, atTop: boolean) => {
      const blockedScrollableIds = blockedScrollableIdsRef.current;
      const wasBlocked = blockedScrollableIds.has(id);

      if (atTop) {
        if (!wasBlocked) return;
        blockedScrollableIds.delete(id);
      } else {
        if (wasBlocked) return;
        blockedScrollableIds.add(id);
      }

      updateScrollableDragState(blockedScrollableIds.size === 0);
    },
    [updateScrollableDragState]
  );

  const unregisterScrollable = React.useCallback(
    (id: string) => {
      const blockedScrollableIds = blockedScrollableIdsRef.current;
      if (!blockedScrollableIds.delete(id)) return;
      updateScrollableDragState(blockedScrollableIds.size === 0);
    },
    [updateScrollableDragState]
  );

  const scrollContext = React.useMemo<sheetDragContext.SheetScrollContextValue>(
    () => ({ setScrollableAtTop, unregisterScrollable }),
    [setScrollableAtTop, unregisterScrollable]
  );

  const lockSheetDrag = React.useCallback(
    (id: string) => {
      const dragLockIds = dragLockIdsRef.current;
      if (dragLockIds.has(id)) return;
      dragLockIds.add(id);
      dragLockCount.value = dragLockIds.size;
      if (isWeb) setIsSheetDragLocked(true);
    },
    [dragLockCount, isWeb]
  );

  const unlockSheetDrag = React.useCallback(
    (id: string) => {
      const dragLockIds = dragLockIdsRef.current;
      if (!dragLockIds.delete(id)) return;
      dragLockCount.value = dragLockIds.size;
      if (isWeb) setIsSheetDragLocked(dragLockIds.size > 0);
    },
    [dragLockCount, isWeb]
  );

  const dragLockContext =
    React.useMemo<sheetDragContext.SheetDragLockContextValue>(
      () => ({ lockSheetDrag, unlockSheetDrag }),
      [lockSheetDrag, unlockSheetDrag]
    );

  const resetSheetDrag = React.useCallback(() => {
    translateY.value = withSpring(
      0,
      sheetDragConstants.SHEET_RESET_SPRING_CONFIG
    );
  }, [translateY]);

  const closeFromSheetDrag = React.useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const clearCloseCompletionTimeout = React.useCallback(() => {
    if (!closeCompletionTimeoutRef.current) return;
    clearTimeout(closeCompletionTimeoutRef.current);
    closeCompletionTimeoutRef.current = null;
  }, []);

  const finishCloseAnimation = React.useCallback(() => {
    clearCloseCompletionTimeout();
    const callbacks = Array.from(closeCompletionCallbacksRef.current);
    closeCompletionCallbacksRef.current.clear();
    for (const callback of callbacks) callback();
  }, [clearCloseCompletionTimeout]);

  const closeWithAnimation = React.useCallback(
    (onClosed: () => void) => {
      closeCompletionCallbacksRef.current.add(onClosed);
      if (isDragClosing.value) return;
      isDragClosing.value = true;
      onCloseAnimationStart?.();
      clearCloseCompletionTimeout();

      closeCompletionTimeoutRef.current = setTimeout(
        finishCloseAnimation,
        sheetDragConstants.SHEET_CLOSE_ANIMATION_DURATION_MS + 50
      );

      translateY.value = withTiming(
        exitTranslation,
        {
          duration: sheetDragConstants.SHEET_CLOSE_ANIMATION_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (!finished) return;
          runOnJS(finishCloseAnimation)();
        }
      );
    },
    [
      clearCloseCompletionTimeout,
      exitTranslation,
      finishCloseAnimation,
      isDragClosing,
      onCloseAnimationStart,
      translateY,
    ]
  );

  const finishSheetDragDismiss = React.useCallback(() => {
    if (isDragClosing.value) return;
    closeWithAnimation(closeFromSheetDrag);
  }, [closeFromSheetDrag, closeWithAnimation, isDragClosing]);

  React.useEffect(() => {
    if (open) {
      clearCloseCompletionTimeout();
      closeCompletionCallbacksRef.current.clear();
      isDragClosing.value = false;
      translateY.value = 0;
      return;
    }

    webTouchStateRef.current = null;
    blockedScrollableIdsRef.current.clear();
    clearCloseCompletionTimeout();
    closeCompletionCallbacksRef.current.clear();
    dragLockIdsRef.current.clear();
    canDragFromScrollableContentValue.value = true;
    dragLockCount.value = 0;
    setCanDragFromScrollableContent(true);
    setIsSheetDragLocked(false);
    isDragClosing.value = false;
    touchStartedInHandle.value = false;
    translateY.value = 0;
  }, [
    canDragFromScrollableContentValue,
    clearCloseCompletionTimeout,
    dragLockCount,
    isDragClosing,
    open,
    touchStartedInHandle,
    translateY,
  ]);

  const sheetStyle = useAnimatedStyle(() => {
    const translationY = Math.max(0, translateY.value);

    const opacity = sheetDragMetrics.getSheetDragOpacity(
      translationY,
      dismissThreshold
    );

    if (translationY <= 0.5) return { opacity };
    return { opacity, transform: [{ translateY: translationY }] };
  });

  const backdropStyle = sheetDragMetrics.useSheetBackdropDragStyle(
    translateY,
    dismissThreshold
  );

  const dismissGesture = React.useMemo(
    () =>
      Gesture.Pan()
        // Drag locks are enforced inside the worklets via dragLockCount so
        // locking/unlocking never rebuilds the gesture while a touch is
        // active (a rebuild cancels native recognizers under the detector).
        .enabled(!isWeb && open && isTopSheet)
        .manualActivation(true)
        .activeOffsetY(sheetDragConstants.SHEET_DISMISS_ACTIVE_OFFSET_Y)
        .failOffsetX([
          -sheetDragConstants.SHEET_DISMISS_FAIL_OFFSET_X,
          sheetDragConstants.SHEET_DISMISS_FAIL_OFFSET_X,
        ])
        .onTouchesDown((event, manager) => {
          'worklet';

          if (dragLockCount.value > 0) {
            manager.fail();
            return;
          }

          const touch = event.allTouches[0];

          if (!touch) {
            manager.fail();
            return;
          }

          touchStartX.value = touch.absoluteX;
          touchStartY.value = touch.absoluteY;

          touchStartedInHandle.value =
            touch.y >= 0 &&
            touch.y <= sheetDragConstants.SHEET_DRAG_HANDLE_HEIGHT;

          if (
            !canDragFromScrollableContentValue.value &&
            !touchStartedInHandle.value
          ) {
            manager.fail();
          }
        })
        .onTouchesMove((event, manager) => {
          'worklet';

          if (dragLockCount.value > 0) {
            manager.fail();
            return;
          }

          const touch = event.allTouches[0];

          if (!touch) {
            manager.fail();
            return;
          }

          const translationX = touch.absoluteX - touchStartX.value;
          const translationY = touch.absoluteY - touchStartY.value;

          if (
            !canDragFromScrollableContentValue.value &&
            !touchStartedInHandle.value
          ) {
            manager.fail();
            return;
          }

          if (
            Math.abs(translationX) >
              sheetDragConstants.SHEET_DISMISS_FAIL_OFFSET_X &&
            Math.abs(translationX) > Math.abs(translationY)
          ) {
            manager.fail();
            return;
          }

          if (
            translationY <= -sheetDragConstants.SHEET_DISMISS_ACTIVE_OFFSET_Y
          ) {
            manager.fail();
            return;
          }

          if (
            translationY >= sheetDragConstants.SHEET_DISMISS_ACTIVE_OFFSET_Y &&
            translationY > Math.abs(translationX)
          ) {
            manager.activate();
          }
        })
        .onBegin(() => {
          'worklet';
          cancelAnimation(translateY);
        })
        .onUpdate((event) => {
          'worklet';
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          'worklet';

          const shouldDismiss =
            event.translationY >= dismissThreshold ||
            event.velocityY >=
              sheetDragConstants.SHEET_DISMISS_VELOCITY_THRESHOLD;

          if (shouldDismiss) {
            runOnJS(finishSheetDragDismiss)();
            return;
          }

          translateY.value = withSpring(
            0,
            sheetDragConstants.SHEET_RESET_SPRING_CONFIG
          );
        })
        .onFinalize(() => {
          'worklet';
          touchStartedInHandle.value = false;
          if (isDragClosing.value) return;
          if (translateY.value === 0) return;

          translateY.value = withSpring(
            0,
            sheetDragConstants.SHEET_RESET_SPRING_CONFIG
          );
        }),
    [
      canDragFromScrollableContentValue,
      dismissThreshold,
      dragLockCount,
      finishSheetDragDismiss,
      isDragClosing,
      isTopSheet,
      isWeb,
      open,
      touchStartedInHandle,
      touchStartX,
      touchStartY,
      translateY,
    ]
  );

  const handleWebTouchStart = React.useCallback(
    (event: GestureResponderEvent) => {
      if (
        !isWeb ||
        !open ||
        !isTopSheet ||
        isDragClosing.value ||
        isSheetDragLocked ||
        webSheetDrag.isWebSheetDragLockedTarget(
          event.nativeEvent.target,
          sheetDragConstants.SHEET_SORTABLE_DRAG_HANDLE_TEST_ID
        )
      ) {
        return;
      }

      const touch = event.nativeEvent.touches[0];

      if (
        !touch ||
        event.nativeEvent.touches.length !== 1 ||
        webSheetDrag.isWebTextEntryTarget(event.nativeEvent.target)
      ) {
        webTouchStateRef.current = null;
        return;
      }

      const startedInHandle = webSheetDrag.isWebSheetDragHandleTarget({
        handleHeight: sheetDragConstants.SHEET_DRAG_HANDLE_HEIGHT,
        pageY: touch.pageY,
        surfaceTestId: sheetDragConstants.SHEET_DRAG_SURFACE_TEST_ID,
        target: event.nativeEvent.target,
      });

      if (!canDragFromScrollableContent && !startedInHandle) return;

      webTouchStateRef.current = {
        isDragging: false,
        lastTime: Date.now(),
        lastY: touch.pageY,
        startedInHandle,
        startTarget: event.nativeEvent.target,
        startX: touch.pageX,
        startY: touch.pageY,
        velocityY: 0,
      };
    },
    [
      canDragFromScrollableContent,
      isDragClosing,
      isSheetDragLocked,
      isTopSheet,
      isWeb,
      open,
    ]
  );

  const handleWebTouchMove = React.useCallback(
    (event: GestureResponderEvent) => {
      if (!isWeb) return;
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
            sheetDragConstants.SHEET_DISMISS_FAIL_OFFSET_X &&
          Math.abs(translationX) > Math.abs(translationY)
        ) {
          webTouchStateRef.current = null;
          return;
        }

        if (translationY <= -sheetDragConstants.SHEET_DISMISS_ACTIVE_OFFSET_Y) {
          webTouchStateRef.current = null;
          return;
        }

        if (
          translationY < sheetDragConstants.SHEET_DISMISS_ACTIVE_OFFSET_Y ||
          translationY <= Math.abs(translationX)
        ) {
          return;
        }

        const deltaY = touchState.startY - touch.pageY;

        if (
          !touchState.startedInHandle &&
          (!canDragFromScrollableContent ||
            webSheetDrag.canWebScrollWithinTarget(
              touchState.startTarget,
              deltaY
            ))
        ) {
          const now = Date.now();
          touchState.lastTime = now;
          touchState.lastY = touch.pageY;
          touchState.startX = touch.pageX;
          touchState.startY = touch.pageY;
          return;
        }

        touchState.isDragging = true;
        cancelAnimation(translateY);
      }

      event.preventDefault();
      const now = Date.now();
      const deltaTime = Math.max(now - touchState.lastTime, 1);

      touchState.velocityY =
        ((touch.pageY - touchState.lastY) / deltaTime) * 1000;

      touchState.lastTime = now;
      touchState.lastY = touch.pageY;
      translateY.value = Math.max(0, translationY);
    },
    [canDragFromScrollableContent, isWeb, translateY]
  );

  const handleWebTouchEnd = React.useCallback(() => {
    const touchState = webTouchStateRef.current;
    webTouchStateRef.current = null;
    if (!touchState?.isDragging) return;
    const translationY = Math.max(0, touchState.lastY - touchState.startY);

    const shouldDismiss =
      translationY >= dismissThreshold ||
      touchState.velocityY >=
        sheetDragConstants.SHEET_DISMISS_VELOCITY_THRESHOLD;

    if (shouldDismiss) {
      finishSheetDragDismiss();
      return;
    }

    resetSheetDrag();
  }, [dismissThreshold, finishSheetDragDismiss, resetSheetDrag]);

  const handleWebTouchCancel = React.useCallback(() => {
    const wasDragging = webTouchStateRef.current?.isDragging ?? false;
    webTouchStateRef.current = null;
    if (!wasDragging) return;
    resetSheetDrag();
  }, [resetSheetDrag]);

  const webTouchHandlers = React.useMemo(
    () => ({
      onTouchCancel: isWeb ? handleWebTouchCancel : undefined,
      onTouchEnd: isWeb ? handleWebTouchEnd : undefined,
      onTouchMove: isWeb ? handleWebTouchMove : undefined,
      onTouchStart: isWeb ? handleWebTouchStart : undefined,
    }),
    [
      handleWebTouchCancel,
      handleWebTouchEnd,
      handleWebTouchMove,
      handleWebTouchStart,
      isWeb,
    ]
  );

  return {
    backdropStyle,
    closeWithAnimation,
    dismissGesture,
    dragLockContext,
    scrollContext,
    sheetStyle,
    webTouchHandlers,
  };
};
