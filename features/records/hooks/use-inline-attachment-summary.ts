import * as React from 'react';
import { Platform } from 'react-native';
import * as textareaMetrics from '@/ui/textarea-metrics';

export type ComposerEditor = 'fullscreen' | 'inline';

export const INLINE_TEXTAREA_MAX_ROWS = 7;

export const INLINE_TEXTAREA_ACCESSORY_BOTTOM_PADDING = 32;

const INLINE_TEXTAREA_PADDING = textareaMetrics.TEXTAREA_SIZE_PADDING.sm;

const INLINE_TEXTAREA_MAX_HEIGHT =
  INLINE_TEXTAREA_MAX_ROWS * textareaMetrics.TEXTAREA_LINE_HEIGHT +
  INLINE_TEXTAREA_PADDING.verticalPadding;

const TEXTAREA_SCROLL_BOTTOM_TOLERANCE = 8;
const TEXTAREA_SCROLL_DIRECTION_TOLERANCE = 2;

type TextareaScrollMetrics = {
  contentHeight?: number;
  estimatedContentHeight?: number;
  offsetY?: number;
  viewportHeight?: number;
  viewportWidth?: number;
};

export function useInlineAttachmentSummary({
  attachmentCount,
  focusedEditor,
  isTextareaFocused,
  isVirtualKeyboardVisible,
  showFullscreenControl,
  text,
}: {
  attachmentCount: number;
  focusedEditor: ComposerEditor | null;
  isTextareaFocused: boolean;
  isVirtualKeyboardVisible: boolean;
  showFullscreenControl: boolean;
  text: string;
}) {
  const [isScrolledToBottom, setIsScrolledToBottom] = React.useState(true);
  const isScrolledToBottomRef = React.useRef(true);
  const lastScrollOffsetYRef = React.useRef<number | undefined>(undefined);
  const metricsRef = React.useRef<TextareaScrollMetrics>({});
  const textRef = React.useRef(text);
  textRef.current = text;

  const updateScrollMetrics = React.useCallback(
    (metrics: TextareaScrollMetrics) => {
      const nextMetrics = { ...metricsRef.current, ...metrics };
      metricsRef.current = nextMetrics;
      const offsetY = metrics.offsetY;
      const previousOffsetY = lastScrollOffsetYRef.current;

      const didScrollUp =
        offsetY !== undefined &&
        previousOffsetY !== undefined &&
        offsetY < previousOffsetY - TEXTAREA_SCROLL_DIRECTION_TOLERANCE;

      if (offsetY !== undefined) lastScrollOffsetYRef.current = offsetY;

      setIsScrolledToBottom((current) => {
        const isAtBottom = isTextareaScrolledToBottom(nextMetrics, {
          unknownContentIsBottom: textRef.current.length === 0,
        });

        // Scrolling up off the bottom is the only thing that hides the summary.
        // The at-bottom check wins over scroll direction so iOS rubber-banding
        // at the bottom edge — which settles with decreasing offsets — doesn't
        // read as scrolling up and hide it.
        if (didScrollUp && !isAtBottom) {
          isScrolledToBottomRef.current = false;
          return current ? false : current;
        }

        // Otherwise it's sticky: once at the bottom it stays visible until the
        // user scrolls up. Typing at the end auto-scrolls the caret into view
        // but rests short of the reserved bottom padding, which would read as
        // "not at bottom" and hide the summary mid-compose if we didn't hold it.
        const next = current || isAtBottom;
        isScrolledToBottomRef.current = next;
        return current === next ? current : next;
      });
    },
    []
  );

  const handleContentSizeChange = React.useCallback(
    (event: unknown) => {
      const contentHeight = getTextareaContentHeightFromEvent(event);
      if (contentHeight === undefined) return;
      updateScrollMetrics({ contentHeight });
    },
    [updateScrollMetrics]
  );

  const handleScroll = React.useCallback(
    (event: unknown) => {
      updateScrollMetrics(getTextareaScrollMetricsFromEvent(event));
    },
    [updateScrollMetrics]
  );

  const handleLayout = React.useCallback(
    (event: unknown) => {
      const metrics = getTextareaLayoutMetricsFromEvent(event);
      if (!metrics.viewportHeight && !metrics.viewportWidth) return;

      if (metrics.viewportWidth) {
        metrics.estimatedContentHeight =
          getEstimatedInlineTextareaContentHeight({
            text: textRef.current,
            viewportWidth: metrics.viewportWidth,
          });
      }

      updateScrollMetrics(metrics);
    },
    [updateScrollMetrics]
  );

  React.useEffect(() => {
    const viewportWidth = metricsRef.current.viewportWidth;
    if (!viewportWidth) return;

    updateScrollMetrics({
      estimatedContentHeight: getEstimatedInlineTextareaContentHeight({
        text,
        viewportWidth,
      }),
    });
  }, [text, updateScrollMetrics]);

  const handleFocus = React.useCallback(() => {
    const next = isTextareaScrolledToBottomOnFocus(
      metricsRef.current,
      textRef.current
    );

    lastScrollOffsetYRef.current = metricsRef.current.offsetY;
    isScrolledToBottomRef.current = next;
    setIsScrolledToBottom(next);
  }, []);

  const reset = React.useCallback(() => {
    metricsRef.current = {};
    lastScrollOffsetYRef.current = undefined;
    isScrolledToBottomRef.current = true;
    setIsScrolledToBottom(true);
  }, []);

  const isInlineEditorFocused = isTextareaFocused && focusedEditor === 'inline';

  const isInlineComposerCompact =
    isInlineEditorFocused &&
    (Platform.OS !== 'web' || isVirtualKeyboardVisible);

  const hasSpace =
    isInlineComposerCompact && (showFullscreenControl || attachmentCount > 0);

  return React.useMemo(
    () => ({
      hasSpace,
      onLayout: handleLayout,
      onContentSizeChange: handleContentSizeChange,
      onFocus: handleFocus,
      onScroll: handleScroll,
      reset,
      show: hasSpace && isScrolledToBottom,
    }),
    [
      handleContentSizeChange,
      handleLayout,
      handleFocus,
      handleScroll,
      hasSpace,
      isScrolledToBottom,
      reset,
    ]
  );
}

// "At the bottom" means the true content bottom is within a few px of the
// viewport bottom. Staying visible while typing at the end — where a native
// UITextView rests the caret short of the reserved bottom padding — is handled
// by stickiness in updateScrollMetrics, not by inflating this threshold. A fat
// threshold made the summary reappear after only a few px of scroll on notes
// that barely overflow the textarea.
const TEXTAREA_SCROLL_BOTTOM_THRESHOLD = TEXTAREA_SCROLL_BOTTOM_TOLERANCE;

function isTextareaScrolledToBottom(
  metrics: TextareaScrollMetrics,
  { unknownContentIsBottom = true }: { unknownContentIsBottom?: boolean } = {}
) {
  const contentHeight = getResolvedTextareaContentHeight(metrics);
  if (contentHeight <= 0) return unknownContentIsBottom;

  const viewportHeight =
    metrics.viewportHeight ??
    Math.min(INLINE_TEXTAREA_MAX_HEIGHT, contentHeight);

  if (contentHeight <= viewportHeight + TEXTAREA_SCROLL_BOTTOM_THRESHOLD) {
    return true;
  }

  return (
    (metrics.offsetY ?? 0) + viewportHeight >=
    contentHeight - TEXTAREA_SCROLL_BOTTOM_THRESHOLD
  );
}

function isTextareaScrolledToBottomOnFocus(
  metrics: TextareaScrollMetrics,
  text: string
) {
  if (text.length === 0) return true;
  const contentHeight = getResolvedTextareaContentHeight(metrics);
  if (contentHeight <= 0) return false;
  return isTextareaScrolledToBottom(metrics, { unknownContentIsBottom: false });
}

function getResolvedTextareaContentHeight(metrics: TextareaScrollMetrics) {
  return metrics.contentHeight ?? metrics.estimatedContentHeight ?? 0;
}

function getTextareaContentHeightFromEvent(event: unknown) {
  const nativeEvent = getObjectProperty(event, 'nativeEvent');
  const contentSize = getObjectProperty(nativeEvent, 'contentSize');
  return getNumberProperty(contentSize, 'height');
}

function getTextareaLayoutMetricsFromEvent(
  event: unknown
): TextareaScrollMetrics {
  const nativeEvent = getObjectProperty(event, 'nativeEvent');
  const layout = getObjectProperty(nativeEvent, 'layout');

  return {
    viewportHeight: getNumberProperty(layout, 'height'),
    viewportWidth: getNumberProperty(layout, 'width'),
  };
}

function getTextareaScrollMetricsFromEvent(
  event: unknown
): TextareaScrollMetrics {
  // Native scroll events carry real scroll metrics on nativeEvent. They must
  // win over the currentTarget branch: with the new architecture,
  // currentTarget is a ReactNativeElement whose DOM-like scrollTop and
  // scrollHeight getters read the shadow tree, which has no scroll state for
  // a TextInput (scrollTop is always 0 and scrollHeight equals clientHeight).
  const nativeEvent = getObjectProperty(event, 'nativeEvent');
  const contentOffset = getObjectProperty(nativeEvent, 'contentOffset');
  const contentSize = getObjectProperty(nativeEvent, 'contentSize');
  const layoutMeasurement = getObjectProperty(nativeEvent, 'layoutMeasurement');

  if (contentOffset || contentSize || layoutMeasurement) {
    return {
      contentHeight: getNumberProperty(contentSize, 'height'),
      offsetY: getNumberProperty(contentOffset, 'y'),
      viewportHeight: getNumberProperty(layoutMeasurement, 'height'),
    };
  }

  const currentTarget = getObjectProperty(event, 'currentTarget');

  return {
    contentHeight: getNumberProperty(currentTarget, 'scrollHeight'),
    offsetY: getNumberProperty(currentTarget, 'scrollTop'),
    viewportHeight: getNumberProperty(currentTarget, 'clientHeight'),
  };
}

function getEstimatedInlineTextareaContentHeight({
  text,
  viewportWidth,
}: {
  text: string;
  viewportWidth: number;
}) {
  return textareaMetrics.getEstimatedTextareaContentHeight({
    horizontalPadding: INLINE_TEXTAREA_PADDING.horizontalPadding,
    text,
    verticalPadding: INLINE_TEXTAREA_PADDING.verticalPadding,
    width: viewportWidth,
  });
}

function getObjectProperty(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return undefined;
  const property = (value as Record<string, unknown>)[key];
  return property && typeof property === 'object' ? property : undefined;
}

function getNumberProperty(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return undefined;
  const property = (value as Record<string, unknown>)[key];

  return typeof property === 'number' && Number.isFinite(property)
    ? property
    : undefined;
}
