import { useTextareaScrolledToBottom } from '@/hooks/use-textarea-scrolled-to-bottom';
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
  const {
    isScrolledToBottom,
    onContentSizeChange,
    onFocus,
    onLayout,
    onScroll,
    reset,
  } = useTextareaScrolledToBottom({
    maxViewportHeight: INLINE_TEXTAREA_MAX_HEIGHT,
    size: 'sm',
    text,
  });

  const isInlineEditorFocused = isTextareaFocused && focusedEditor === 'inline';

  const isInlineComposerCompact =
    isInlineEditorFocused &&
    (Platform.OS !== 'web' || isVirtualKeyboardVisible);

  const hasSpace =
    isInlineComposerCompact && (showFullscreenControl || attachmentCount > 0);

  return React.useMemo(
    () => ({
      hasSpace,
      onContentSizeChange,
      onFocus,
      onLayout,
      onScroll,
      reset,
      show: hasSpace && isScrolledToBottom,
    }),
    [
      hasSpace,
      isScrolledToBottom,
      onContentSizeChange,
      onFocus,
      onLayout,
      onScroll,
      reset,
    ]
  );
}
