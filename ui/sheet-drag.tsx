import * as React from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import * as webSheetDrag from '@/ui/sheet-drag-web';

import {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SHEET_DISMISS_ACTIVE_OFFSET_Y = 10;
const SHEET_DISMISS_FAIL_OFFSET_X = 24;
const SHEET_DISMISS_THRESHOLD_MIN_PX = 72;
const SHEET_DISMISS_THRESHOLD_MAX_PX = 160;
const SHEET_DISMISS_THRESHOLD_RATIO = 0.14;
const SHEET_DISMISS_VELOCITY_THRESHOLD = 900;
const SHEET_EXIT_TRANSLATION_MIN_PX = 220;
const SHEET_EXIT_TRANSLATION_RATIO = 0.38;
const SHEET_CLOSE_ANIMATION_DURATION_MS = 180;
const SHEET_SCROLL_TOP_TOLERANCE = 1;
const SHEET_DRAG_HANDLE_HEIGHT = 20;
const SHEET_RESET_SPRING_CONFIG = { damping: 28, mass: 1, stiffness: 280 };

type SheetScrollContextValue = {
  setScrollableAtTop: (id: string, atTop: boolean) => void;
  unregisterScrollable: (id: string) => void;
};

type SheetDragLockContextValue = {
  lockSheetDrag: (id: string) => void;
  unlockSheetDrag: (id: string) => void;
};

type SheetScrollableEvent = { nativeEvent: { contentOffset?: { y?: number } } };

type SheetDragMetrics = {
  dismissThreshold: number;
  exitTranslation: number;
  translateY: SharedValue<number>;
};

type SheetDragBehaviorOptions = SheetDragMetrics & {
  isTopSheet: boolean;
  isWeb: boolean;
  onDismiss: () => void;
  open: boolean;
};

const SHEET_SORTABLE_DRAG_HANDLE_TEST_ID = 'sheet-sortable-drag-handle';
const SHEET_DRAG_SURFACE_TEST_ID = 'sheet-drag-surface';

const SheetScrollContext = React.createContext<SheetScrollContextValue | null>(
  null
);

const SheetDragLockContext =
  React.createContext<SheetDragLockContextValue | null>(null);

const getSheetDismissThreshold = (windowHeight: number) =>
  Math.min(
    SHEET_DISMISS_THRESHOLD_MAX_PX,
    Math.max(
      SHEET_DISMISS_THRESHOLD_MIN_PX,
      windowHeight * SHEET_DISMISS_THRESHOLD_RATIO
    )
  );

const getSheetExitTranslation = (windowHeight: number) =>
  Math.max(
    SHEET_EXIT_TRANSLATION_MIN_PX,
    windowHeight * SHEET_EXIT_TRANSLATION_RATIO
  );

const getSheetDragOpacity = (translationY: number, fadeDistance: number) => {
  'worklet';
  const distance = Math.max(fadeDistance, 1);
  const progress = Math.min(Math.max(translationY, 0), distance) / distance;
  return 1 - progress;
};

export const useSheetBackdropDragStyle = (
  translateY?: SharedValue<number>,
  fadeDistance = SHEET_DISMISS_THRESHOLD_MIN_PX
) =>
  useAnimatedStyle(() => {
    const translationY = translateY ? translateY.value : 0;
    return { opacity: getSheetDragOpacity(translationY, fadeDistance) };
  });

export const useSheetDragMetrics = (windowHeight: number): SheetDragMetrics => {
  const translateY = useSharedValue(0);

  const dismissThreshold = React.useMemo(
    () => getSheetDismissThreshold(windowHeight),
    [windowHeight]
  );

  const exitTranslation = React.useMemo(
    () => getSheetExitTranslation(windowHeight),
    [windowHeight]
  );

  return { dismissThreshold, exitTranslation, translateY };
};

export const useSheetScrollHandler = <Event extends SheetScrollableEvent>(
  onScroll?: (event: Event) => void
) => {
  const context = React.useContext(SheetScrollContext);
  const scrollableId = React.useId();
  const isAtTopRef = React.useRef(true);

  React.useEffect(
    () => () => context?.unregisterScrollable(scrollableId),
    [context, scrollableId]
  );

  return React.useCallback(
    (event: Event) => {
      const offsetY = event.nativeEvent.contentOffset?.y ?? 0;
      const isAtTop = offsetY <= SHEET_SCROLL_TOP_TOLERANCE;

      if (isAtTopRef.current !== isAtTop) {
        isAtTopRef.current = isAtTop;
        context?.setScrollableAtTop(scrollableId, isAtTop);
      }

      onScroll?.(event);
    },
    [context, onScroll, scrollableId]
  );
};

export const useSheetDragLock = () => {
  const context = React.useContext(SheetDragLockContext);
  const lockId = React.useId();
  const isLockedRef = React.useRef(false);

  const unlock = React.useCallback(() => {
    if (!isLockedRef.current) return;
    isLockedRef.current = false;
    context?.unlockSheetDrag(lockId);
  }, [context, lockId]);

  const lock = React.useCallback(() => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;
    context?.lockSheetDrag(lockId);
  }, [context, lockId]);

  React.useEffect(() => unlock, [unlock]);
  return React.useMemo(() => ({ lock, unlock }), [lock, unlock]);
};

export const SHEET_SORTABLE_DRAG_HANDLE_PROPS = {
  testID: SHEET_SORTABLE_DRAG_HANDLE_TEST_ID,
} as const;

export const SHEET_DRAG_SURFACE_PROPS = {
  testID: SHEET_DRAG_SURFACE_TEST_ID,
} as const;

export const SheetDragProviders = ({
  children,
  dragLock,
  scroll,
}: {
  children: React.ReactNode;
  dragLock: SheetDragLockContextValue;
  scroll: SheetScrollContextValue;
}) => (
  <SheetDragLockContext.Provider value={dragLock}>
    <SheetScrollContext.Provider value={scroll}>
      {children}
    </SheetScrollContext.Provider>
  </SheetDragLockContext.Provider>
);

export const useSheetDragBehavior = ({
  dismissThreshold,
  exitTranslation,
  isTopSheet,
  isWeb,
  onDismiss,
  open,
  translateY,
}: SheetDragBehaviorOptions) => {
  const blockedScrollableIdsRef = React.useRef(new Set<string>());
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

  const updateScrollableDragState = React.useCallback(
    (canDrag: boolean) => {
      canDragFromScrollableContentValue.value = canDrag;
      setCanDragFromScrollableContent(canDrag);
    },
    [canDragFromScrollableContentValue]
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

  const scrollContext = React.useMemo(
    () => ({ setScrollableAtTop, unregisterScrollable }),
    [setScrollableAtTop, unregisterScrollable]
  );

  const lockSheetDrag = React.useCallback(
    (id: string) => {
      const dragLockIds = dragLockIdsRef.current;
      if (dragLockIds.has(id)) return;
      dragLockIds.add(id);
      dragLockCount.value = dragLockIds.size;
      setIsSheetDragLocked(true);
    },
    [dragLockCount]
  );

  const unlockSheetDrag = React.useCallback(
    (id: string) => {
      const dragLockIds = dragLockIdsRef.current;
      if (!dragLockIds.delete(id)) return;
      dragLockCount.value = dragLockIds.size;
      setIsSheetDragLocked(dragLockIds.size > 0);
    },
    [dragLockCount]
  );

  const dragLockContext = React.useMemo(
    () => ({ lockSheetDrag, unlockSheetDrag }),
    [lockSheetDrag, unlockSheetDrag]
  );

  const resetSheetDrag = React.useCallback(() => {
    translateY.value = withSpring(0, SHEET_RESET_SPRING_CONFIG);
  }, [translateY]);

  const closeFromSheetDrag = React.useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const finishSheetDragDismiss = React.useCallback(() => {
    if (isDragClosing.value) return;
    isDragClosing.value = true;

    translateY.value = withTiming(
      exitTranslation,
      {
        duration: SHEET_CLOSE_ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (!finished) return;
        runOnJS(closeFromSheetDrag)();
      }
    );
  }, [closeFromSheetDrag, exitTranslation, isDragClosing, translateY]);

  React.useEffect(() => {
    if (open) {
      isDragClosing.value = false;
      translateY.value = 0;
      return;
    }

    webTouchStateRef.current = null;
    blockedScrollableIdsRef.current.clear();
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
    dragLockCount,
    isDragClosing,
    open,
    touchStartedInHandle,
    translateY,
  ]);

  const sheetStyle = useAnimatedStyle(() => {
    const translationY = Math.max(0, translateY.value);

    return {
      opacity: getSheetDragOpacity(translationY, dismissThreshold),
      transform: [{ translateY: translationY }],
    };
  });

  const backdropStyle = useSheetBackdropDragStyle(translateY, dismissThreshold);

  const dismissGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isWeb && open && isTopSheet && !isSheetDragLocked)
        .manualActivation(true)
        .activeOffsetY(SHEET_DISMISS_ACTIVE_OFFSET_Y)
        .failOffsetX([
          -SHEET_DISMISS_FAIL_OFFSET_X,
          SHEET_DISMISS_FAIL_OFFSET_X,
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
            touch.y >= 0 && touch.y <= SHEET_DRAG_HANDLE_HEIGHT;

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
            Math.abs(translationX) > SHEET_DISMISS_FAIL_OFFSET_X &&
            Math.abs(translationX) > Math.abs(translationY)
          ) {
            manager.fail();
            return;
          }

          if (translationY <= -SHEET_DISMISS_ACTIVE_OFFSET_Y) {
            manager.fail();
            return;
          }

          if (
            translationY >= SHEET_DISMISS_ACTIVE_OFFSET_Y &&
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
            event.velocityY >= SHEET_DISMISS_VELOCITY_THRESHOLD;

          if (shouldDismiss) {
            if (isDragClosing.value) return;
            isDragClosing.value = true;

            translateY.value = withTiming(
              exitTranslation,
              {
                duration: SHEET_CLOSE_ANIMATION_DURATION_MS,
                easing: Easing.out(Easing.cubic),
              },
              (finished) => {
                if (!finished) return;
                runOnJS(closeFromSheetDrag)();
              }
            );

            return;
          }

          translateY.value = withSpring(0, SHEET_RESET_SPRING_CONFIG);
        })
        .onFinalize(() => {
          'worklet';
          touchStartedInHandle.value = false;
          if (isDragClosing.value) return;
          if (translateY.value === 0) return;
          translateY.value = withSpring(0, SHEET_RESET_SPRING_CONFIG);
        }),
    [
      canDragFromScrollableContentValue,
      closeFromSheetDrag,
      dismissThreshold,
      dragLockCount,
      exitTranslation,
      isDragClosing,
      isSheetDragLocked,
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
          SHEET_SORTABLE_DRAG_HANDLE_TEST_ID
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
        handleHeight: SHEET_DRAG_HANDLE_HEIGHT,
        pageY: touch.pageY,
        surfaceTestId: SHEET_DRAG_SURFACE_TEST_ID,
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
          Math.abs(translationX) > SHEET_DISMISS_FAIL_OFFSET_X &&
          Math.abs(translationX) > Math.abs(translationY)
        ) {
          webTouchStateRef.current = null;
          return;
        }

        if (translationY <= -SHEET_DISMISS_ACTIVE_OFFSET_Y) {
          webTouchStateRef.current = null;
          return;
        }

        if (
          translationY < SHEET_DISMISS_ACTIVE_OFFSET_Y ||
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
      touchState.velocityY >= SHEET_DISMISS_VELOCITY_THRESHOLD;

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
    dismissGesture,
    dragLockContext,
    scrollContext,
    sheetStyle,
    webTouchHandlers,
  };
};
