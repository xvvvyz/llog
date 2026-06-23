import * as React from 'react';
import * as textareaMetrics from '@/ui/textarea-metrics';

const TEXTAREA_SCROLL_BOTTOM_TOLERANCE = 8;
const TEXTAREA_SCROLL_DIRECTION_TOLERANCE = 2;
// "At the bottom" means the true content bottom is within a few px of the
// viewport bottom. Staying visible while typing at the end — where a native
// UITextView rests the caret short of the reserved bottom padding — is handled
// by stickiness in updateScrollMetrics, not by inflating this threshold. A fat
// threshold made the summary reappear after only a few px of scroll on notes
// that barely overflow the textarea.
const TEXTAREA_SCROLL_BOTTOM_THRESHOLD = TEXTAREA_SCROLL_BOTTOM_TOLERANCE;

type TextareaScrollMetrics = {
  contentHeight?: number;
  estimatedContentHeight?: number;
  offsetY?: number;
  viewportHeight?: number;
  viewportWidth?: number;
};

/**
 * Tracks whether a textarea is scrolled to its content bottom, the signal an
 * accessory pinned to the bottom edge uses to stay out of the way while reading
 * higher up. Wire `onContentSizeChange`, `onFocus`, `onLayout`, and `onScroll`
 * onto the `Textarea`; `maxViewportHeight` bounds the fallback height for an
 * auto-sizing textarea and is omitted for a fill textarea that always reports a
 * real viewport.
 */
export function useTextareaScrolledToBottom({
  maxViewportHeight,
  size = 'default',
  text,
}: {
  maxViewportHeight?: number;
  size?: textareaMetrics.TextareaSize;
  text: string;
}) {
  const padding = textareaMetrics.TEXTAREA_SIZE_PADDING[size];
  const [isScrolledToBottom, setIsScrolledToBottom] = React.useState(true);
  const lastScrollOffsetYRef = React.useRef<number | undefined>(undefined);
  const metricsRef = React.useRef<TextareaScrollMetrics>({});
  const textRef = React.useRef(text);
  textRef.current = text;

  const estimateContentHeight = React.useCallback(
    (viewportWidth: number) =>
      textareaMetrics.getEstimatedTextareaContentHeight({
        horizontalPadding: padding.horizontalPadding,
        text: textRef.current,
        verticalPadding: padding.verticalPadding,
        width: viewportWidth,
      }),
    [padding.horizontalPadding, padding.verticalPadding]
  );

  const updateScrollMetrics = React.useCallback(
    (metrics: TextareaScrollMetrics) => {
      const nextMetrics = { ...metricsRef.current, ...metrics };
      metricsRef.current = nextMetrics;
      const previousOffsetY = lastScrollOffsetYRef.current;

      if (metrics.offsetY !== undefined) {
        lastScrollOffsetYRef.current = metrics.offsetY;
      }

      setIsScrolledToBottom((current) =>
        getNextScrolledToBottom({
          current,
          maxViewportHeight,
          metrics: nextMetrics,
          previousOffsetY,
          text: textRef.current,
        })
      );
    },
    [maxViewportHeight]
  );

  const onContentSizeChange = React.useCallback(
    (event: unknown) => {
      const contentHeight = getTextareaContentHeightFromEvent(event);
      if (contentHeight === undefined) return;
      updateScrollMetrics({ contentHeight });
    },
    [updateScrollMetrics]
  );

  const onScroll = React.useCallback(
    (event: unknown) => {
      updateScrollMetrics(getTextareaScrollMetricsFromEvent(event));
    },
    [updateScrollMetrics]
  );

  const onLayout = React.useCallback(
    (event: unknown) => {
      const metrics = getTextareaLayoutMetricsFromEvent(event);
      if (!metrics.viewportHeight && !metrics.viewportWidth) return;

      if (metrics.viewportWidth) {
        metrics.estimatedContentHeight = estimateContentHeight(
          metrics.viewportWidth
        );
      }

      updateScrollMetrics(metrics);
    },
    [estimateContentHeight, updateScrollMetrics]
  );

  React.useEffect(() => {
    const viewportWidth = metricsRef.current.viewportWidth;
    if (!viewportWidth) return;

    updateScrollMetrics({
      estimatedContentHeight: estimateContentHeight(viewportWidth),
    });
  }, [estimateContentHeight, text, updateScrollMetrics]);

  const onFocus = React.useCallback(() => {
    const next = isTextareaScrolledToBottomOnFocus(metricsRef.current, {
      maxViewportHeight,
      text: textRef.current,
    });

    lastScrollOffsetYRef.current = metricsRef.current.offsetY;
    setIsScrolledToBottom(next);
  }, [maxViewportHeight]);

  const reset = React.useCallback(() => {
    metricsRef.current = {};
    lastScrollOffsetYRef.current = undefined;
    setIsScrolledToBottom(true);
  }, []);

  return {
    isScrolledToBottom,
    onContentSizeChange,
    onFocus,
    onLayout,
    onScroll,
    reset,
  };
}

export function getNextScrolledToBottom({
  current,
  maxViewportHeight,
  metrics,
  previousOffsetY,
  text,
}: {
  current: boolean;
  maxViewportHeight?: number;
  metrics: TextareaScrollMetrics;
  previousOffsetY?: number;
  text: string;
}) {
  const offsetY = metrics.offsetY;

  const didScrollUp =
    offsetY !== undefined &&
    previousOffsetY !== undefined &&
    offsetY < previousOffsetY - TEXTAREA_SCROLL_DIRECTION_TOLERANCE;

  const isAtBottom = isTextareaScrolledToBottom(metrics, {
    maxViewportHeight,
    unknownContentIsBottom: text.length === 0,
  });

  // Scrolling up off the bottom is the only thing that hides the accessory. The
  // at-bottom check wins over scroll direction so iOS rubber-banding at the
  // bottom edge — which settles with decreasing offsets — doesn't read as
  // scrolling up and hide it.
  if (didScrollUp && !isAtBottom) return false;
  // Otherwise it's sticky: once at the bottom it stays visible until the user
  // scrolls up. Typing at the end auto-scrolls the caret into view but rests
  // short of the reserved bottom padding, which would read as "not at bottom"
  // and hide the accessory mid-compose if we didn't hold it.
  return current || isAtBottom;
}

function isTextareaScrolledToBottom(
  metrics: TextareaScrollMetrics,
  {
    maxViewportHeight,
    unknownContentIsBottom = true,
  }: { maxViewportHeight?: number; unknownContentIsBottom?: boolean } = {}
) {
  const contentHeight = getResolvedTextareaContentHeight(metrics);
  if (contentHeight <= 0) return unknownContentIsBottom;

  const viewportHeight =
    metrics.viewportHeight ??
    (maxViewportHeight !== undefined
      ? Math.min(maxViewportHeight, contentHeight)
      : contentHeight);

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
  { maxViewportHeight, text }: { maxViewportHeight?: number; text: string }
) {
  if (text.length === 0) return true;
  const contentHeight = getResolvedTextareaContentHeight(metrics);
  if (contentHeight <= 0) return false;

  return isTextareaScrolledToBottom(metrics, {
    maxViewportHeight,
    unknownContentIsBottom: false,
  });
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
