import * as React from 'react';
import { SHEET_SCROLL_TOP_TOLERANCE } from '@/ui/sheet-drag-constants';
import { useSheetScrollHandler } from '@/ui/sheet-drag-context';

import {
  Platform,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

// Native ScrollViews inside sheets stay scroll-disabled until their content
// actually overflows the viewport, so the sheet dismiss gesture wins while
// everything fits on screen. The hook also resolves the effective
// `scrollEnabled` (web keeps the caller's value; native gates on real
// overflow) and wires the sheet drag handler off that same value, so every
// consumer shares one source of truth instead of re-deriving it.
export const useNativeScrollOverflow = ({
  onContentSizeChange,
  onLayout,
  onScroll,
  scrollEnabled,
}: {
  onContentSizeChange?: (width: number, height: number) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEnabled?: boolean;
} = {}) => {
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [contentHeight, setContentHeight] = React.useState(0);

  const hasNativeOverflow =
    Platform.OS !== 'web' &&
    viewportHeight > 0 &&
    contentHeight > viewportHeight + SHEET_SCROLL_TOP_TOLERANCE;

  const resolvedScrollEnabled =
    Platform.OS === 'web'
      ? scrollEnabled
      : scrollEnabled !== false && hasNativeOverflow;

  const handleScroll = useSheetScrollHandler(onScroll, {
    scrollable: resolvedScrollEnabled !== false,
  });

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      setViewportHeight(Math.ceil(event.nativeEvent.layout.height));
      onLayout?.(event);
    },
    [onLayout]
  );

  const handleContentSizeChange = React.useCallback(
    (width: number, height: number) => {
      setContentHeight(Math.ceil(height));
      onContentSizeChange?.(width, height);
    },
    [onContentSizeChange]
  );

  return {
    handleContentSizeChange,
    handleLayout,
    handleScroll,
    hasNativeOverflow,
    scrollEnabled: resolvedScrollEnabled,
  };
};
