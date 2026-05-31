import { cn } from '@/lib/cn';
import { useSheetScrollHandler } from '@/ui/sheet-drag-context';
import { isTextEntryElement } from '@/ui/sheet-platform-web-text-entry';
import { Spinner } from '@/ui/spinner';
import * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import * as sheetScrollStyle from '@/ui/sheet-scroll-style';

import {
  AndroidSoftInputModes,
  KeyboardAwareScrollView,
  KeyboardController,
  type KeyboardAwareScrollViewMode,
} from 'react-native-keyboard-controller';

type SheetFormScrollViewProps = React.ComponentPropsWithoutRef<
  typeof ScrollView
> &
  sheetScrollStyle.SheetScrollContentVariantProps & {
    bottomOffset?: number;
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
      className,
      children,
      contentContainerClassName,
      extraKeyboardSpace = 0,
      keyboardAware = true,
      keyboardDismissMode = Platform.OS === 'web' ? 'none' : 'on-drag',
      keyboardShouldPersistTaps = 'always',
      loading,
      mode = 'insets',
      onScroll,
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

    const handleScroll = useSheetScrollHandler(onScroll);
    const handleRef = useCombinedScrollViewRef(ref, scrollViewRef);
    useAndroidResizeMode(keyboardAware);
    useWebFocusedInputScroll({ enabled: keyboardAware, scrollViewRef });

    const scrollViewProps = {
      keyboardDismissMode,
      keyboardShouldPersistTaps,
      onScroll: handleScroll,
      scrollEventThrottle,
      showsVerticalScrollIndicator,
      style,
      className: cn(
        sheetScrollStyle.SHEET_SCROLL_VIEW_CLASS_NAME,
        'flex-1',
        className
      ),
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
