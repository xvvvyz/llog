import { cn } from '@/lib/cn';
import { isTextEntryElement } from '@/ui/sheet-platform-web-text-entry';
import { Spinner } from '@/ui/spinner';
import { useNativeScrollOverflow } from '@/ui/use-native-scroll-overflow';
import * as React from 'react';
import * as sheetScrollStyle from '@/ui/sheet-scroll-style';
import { Platform, ScrollView, View } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';

import {
  AndroidSoftInputModes,
  KeyboardAwareScrollView,
  KeyboardController,
  useKeyboardState,
  useReanimatedFocusedInput,
  useWindowDimensions as useKeyboardWindowDimensions,
  type KeyboardAwareScrollViewMode,
} from 'react-native-keyboard-controller';

type SheetFormScrollViewProps = React.ComponentPropsWithoutRef<
  typeof ScrollView
> &
  sheetScrollStyle.SheetScrollContentVariantProps & {
    bottomOffset?: number;
    /**
     * Native only. When true, the focused input is scrolled to the vertical
     * center of the visible area above the keyboard instead of resting just
     * above it. Web already centers via `scrollIntoView`.
     */
    centerFocusedInput?: boolean;
    /**
     * Approximate distance from the top of the window to the top of this scroll
     * view (sheet top inset + drag handle). Used to center the focused input
     * within the visible area; precision is not critical.
     */
    centerTopInset?: number;
    className?: string;
    contentContainerClassName?: string;
    extraKeyboardSpace?: number;
    keyboardAware?: boolean;
    loading?: boolean;
    mode?: KeyboardAwareScrollViewMode;
  };

export const SheetFormScrollView = React.forwardRef<
  React.ComponentRef<typeof ScrollView>,
  SheetFormScrollViewProps
>(
  (
    {
      bottomOffset = 96,
      centerFocusedInput = false,
      centerTopInset = 96,
      className,
      children,
      contentContainerClassName,
      extraKeyboardSpace = 0,
      keyboardAware = true,
      keyboardDismissMode = Platform.OS === 'web' ? 'none' : 'on-drag',
      keyboardShouldPersistTaps = 'always',
      loading,
      mode = 'insets',
      onContentSizeChange,
      onLayout,
      onScroll,
      scrollEnabled,
      showsVerticalScrollIndicator = false,
      scrollEventThrottle = 16,
      style,
      variant,
      ...props
    },
    ref
  ) => {
    const scrollViewRef = React.useRef<React.ComponentRef<
      typeof ScrollView
    > | null>(null);

    const {
      handleContentSizeChange,
      handleLayout,
      handleScroll,
      scrollEnabled: resolvedScrollEnabled,
    } = useNativeScrollOverflow({
      onContentSizeChange,
      onLayout,
      onScroll,
      scrollEnabled,
    });

    const handleRef = useCombinedScrollViewRef(ref, scrollViewRef);
    useAndroidResizeMode(keyboardAware);
    useWebFocusedInputScroll({ enabled: keyboardAware, scrollViewRef });

    const scrollViewProps = {
      keyboardDismissMode,
      keyboardShouldPersistTaps,
      onContentSizeChange: handleContentSizeChange,
      onLayout: handleLayout,
      onScroll: handleScroll,
      scrollEnabled: resolvedScrollEnabled,
      scrollEventThrottle,
      showsVerticalScrollIndicator,
      style,
      className: cn(sheetScrollStyle.SHEET_SCROLL_VIEW_CLASS_NAME, className),
      contentContainerClassName: cn(
        sheetScrollStyle.sheetScrollContentVariants({ variant }),
        contentContainerClassName,
        'relative',
        loading && 'min-h-24'
      ),
      ...props,
    };

    const content = (
      <React.Fragment>
        {children}
        {loading && (
          <View className="absolute inset-0 z-10 min-h-24 bg-popover/80 items-center justify-center">
            <Spinner />
          </View>
        )}
      </React.Fragment>
    );

    if (Platform.OS === 'web') {
      return (
        <ScrollView ref={handleRef} {...scrollViewProps}>
          {content}
        </ScrollView>
      );
    }

    if (centerFocusedInput) {
      return (
        <CenteringKeyboardAwareScrollView
          ref={handleRef}
          bottomOffset={bottomOffset}
          centerTopInset={centerTopInset}
          enabled={keyboardAware}
          extraKeyboardSpace={extraKeyboardSpace}
          mode={mode}
          {...scrollViewProps}
        >
          {content}
        </CenteringKeyboardAwareScrollView>
      );
    }

    return (
      <KeyboardAwareScrollView
        ref={handleRef}
        bottomOffset={bottomOffset}
        enabled={keyboardAware}
        extraKeyboardSpace={extraKeyboardSpace}
        mode={mode}
        {...scrollViewProps}
      >
        {content}
      </KeyboardAwareScrollView>
    );
  }
);

SheetFormScrollView.displayName = 'SheetFormScrollView';
// Upper bound so a very large visible area (e.g. tablets) never scrolls the
// focused input absurdly far above the keyboard.
const CENTERED_FOCUS_MAX_OFFSET = 320;

type CenteringKeyboardAwareScrollViewProps = React.ComponentPropsWithoutRef<
  typeof KeyboardAwareScrollView
> & { centerTopInset: number };

// The library's `KeyboardAwareScrollView` scrolls the focused input so its
// bottom sits `bottomOffset` above the keyboard. To center the input instead,
// we feed it a `bottomOffset` equal to half the leftover space in the visible
// area: gap below = (visibleHeight - inputHeight) / 2 leaves an equal gap above.
// Changing `bottomOffset` re-runs the library's own scroll, so it stays in sync
// as the keyboard toggles or focus moves between fields.
const CenteringKeyboardAwareScrollView = React.forwardRef<
  React.ComponentRef<typeof KeyboardAwareScrollView>,
  CenteringKeyboardAwareScrollViewProps
>(({ bottomOffset = 0, centerTopInset, enabled = true, ...props }, ref) => {
  const { height: windowHeight } = useKeyboardWindowDimensions();
  const keyboardHeight = useKeyboardState((state) => state.height);
  const { input } = useReanimatedFocusedInput();
  const [focusedInputHeight, setFocusedInputHeight] = React.useState(0);

  // input.value lives on the UI thread; mirror just its height onto the JS
  // thread so we can fold it into the offset math.
  useAnimatedReaction(
    () => Math.round(input.value?.layout.height ?? 0),
    (current, previous) => {
      if (current !== previous) runOnJS(setFocusedInputHeight)(current);
    }
  );

  const centeredBottomOffset = React.useMemo(() => {
    if (!enabled || keyboardHeight <= 0) return bottomOffset;
    const visibleHeight = windowHeight - keyboardHeight - centerTopInset;
    if (visibleHeight <= 0) return bottomOffset;
    const centered = Math.round((visibleHeight - focusedInputHeight) / 2);

    // Never go below the resting offset, so short visible areas or tall inputs
    // fall back to the default (input just above the keyboard).
    return Math.min(
      Math.max(centered, bottomOffset),
      CENTERED_FOCUS_MAX_OFFSET
    );
  }, [
    bottomOffset,
    centerTopInset,
    enabled,
    focusedInputHeight,
    keyboardHeight,
    windowHeight,
  ]);

  return (
    <KeyboardAwareScrollView
      ref={ref}
      bottomOffset={centeredBottomOffset}
      enabled={enabled}
      {...props}
    />
  );
});

CenteringKeyboardAwareScrollView.displayName =
  'CenteringKeyboardAwareScrollView';

const useAndroidResizeMode = (enabled: boolean) => {
  React.useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    KeyboardController.setInputMode(
      AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE
    );

    return () => KeyboardController.setDefaultMode();
  }, [enabled]);
};

const useCombinedScrollViewRef = (
  forwardedRef:
    | React.ForwardedRef<React.ComponentRef<typeof ScrollView>>
    | undefined,
  localRef: React.MutableRefObject<React.ComponentRef<typeof ScrollView> | null>
) =>
  React.useCallback(
    (node: React.ComponentRef<typeof ScrollView> | null) => {
      localRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
        return;
      }

      if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef, localRef]
  );

const useWebFocusedInputScroll = ({
  enabled,
  scrollViewRef,
}: {
  enabled: boolean;
  scrollViewRef: React.MutableRefObject<React.ComponentRef<
    typeof ScrollView
  > | null>;
}) => {
  const frameRef = React.useRef<number | null>(null);

  const scrollFocusedInputIntoView = React.useCallback(() => {
    if (Platform.OS !== 'web') return;
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement || !isTextEntryElement(activeElement)) return;

    const scrollElement = getWebScrollElement(
      scrollViewRef.current,
      activeElement
    );

    if (!scrollElement?.contains(activeElement)) return;
    activeElement.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [scrollViewRef]);

  const scheduleScrollFocusedInputIntoView = React.useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      scrollFocusedInputIntoView();
    });
  }, [scrollFocusedInputIntoView]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !enabled) {
      return;
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!isTextEntryElement(target)) return;
      const scrollElement = getWebScrollElement(scrollViewRef.current, target);
      if (!scrollElement?.contains(target)) return;
      scheduleScrollFocusedInputIntoView();
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('resize', scheduleScrollFocusedInputIntoView);

    window.visualViewport?.addEventListener(
      'resize',
      scheduleScrollFocusedInputIntoView
    );

    window.visualViewport?.addEventListener(
      'scroll',
      scheduleScrollFocusedInputIntoView
    );

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('resize', scheduleScrollFocusedInputIntoView);

      window.visualViewport?.removeEventListener(
        'resize',
        scheduleScrollFocusedInputIntoView
      );

      window.visualViewport?.removeEventListener(
        'scroll',
        scheduleScrollFocusedInputIntoView
      );
    };
  }, [enabled, scheduleScrollFocusedInputIntoView, scrollViewRef]);
};

type WebScrollViewHandle = { getScrollableNode?: () => unknown };

const getWebScrollElement = (
  scrollView: React.ComponentRef<typeof ScrollView> | null,
  activeElement?: HTMLElement
) => {
  const handle = scrollView as (WebScrollViewHandle & HTMLElement) | null;

  const node =
    typeof handle?.getScrollableNode === 'function'
      ? handle.getScrollableNode()
      : handle;

  if (
    node instanceof HTMLElement &&
    node.contains(activeElement ?? node) &&
    isScrollableElement(node)
  ) {
    return node;
  }

  return activeElement ? getScrollableAncestor(activeElement) : null;
};

const getScrollableAncestor = (element: HTMLElement) => {
  let current = element.parentElement;

  while (current && current !== document.body) {
    if (isScrollableElement(current)) return current;
    current = current.parentElement;
  }

  return null;
};

const isScrollableElement = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);

  return (
    /(auto|scroll)/.test(style.overflowY) &&
    element.scrollHeight > element.clientHeight
  );
};
