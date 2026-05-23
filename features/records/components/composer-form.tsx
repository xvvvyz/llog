import { AttachmentSummary } from '@/features/records/components/attachment-summary';
import { MarkdownShortcutToolbar } from '@/features/records/components/markdown-shortcut-toolbar';
import { useMarkdownTextareaShortcuts } from '@/features/records/hooks/use-markdown-textarea-shortcuts';
import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { useVirtualKeyboardVisible } from '@/hooks/use-virtual-keyboard-visible';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { CornersOut } from 'phosphor-react-native';
import * as React from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const COMPOSER_TEXT_MAX_LENGTH = 10240;
const INLINE_TEXTAREA_MAX_ROWS = 7;
const INLINE_TEXTAREA_MAX_HEIGHT = INLINE_TEXTAREA_MAX_ROWS * 20 + 20;
const TEXTAREA_SCROLL_BOTTOM_TOLERANCE = 8;
type ComposerEditor = 'fullscreen' | 'inline';
type TextareaBlurHandle = { blur?: () => void };

type TextareaScrollMetrics = {
  contentHeight?: number;
  offsetY?: number;
  viewportHeight?: number;
};

export const ComposerForm = ({
  attachmentCount,
  autoFocusOnNative = true,
  hasContent,
  isBusy,
  isOpen,
  isSubmitting,
  isTextInputDisabled = false,
  isTextareaFocused,
  logColor,
  filePreview,
  fullscreenPortalName,
  onChangeText,
  inputAccessory,
  inputAction,
  onSubmit,
  onTextareaFocusChange,
  placeholder,
  showFormattingControls = true,
  showFullscreenControl = true,
  submitLabel,
  submitTextClassName,
  submitVariant,
  text,
  toolbar,
}: {
  attachmentCount: number;
  autoFocusOnNative?: boolean;
  hasContent: boolean;
  isBusy: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  isTextInputDisabled?: boolean;
  isTextareaFocused: boolean;
  logColor?: string;
  filePreview: React.ReactNode;
  fullscreenPortalName: string;
  inputAccessory?: React.ReactNode;
  inputAction?: React.ReactNode;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onTextareaFocusChange: (isFocused: boolean) => void;
  placeholder: string;
  showFormattingControls?: boolean;
  showFullscreenControl?: boolean;
  submitLabel: string;
  submitTextClassName?: string;
  submitVariant?: React.ComponentPropsWithoutRef<typeof Button>['variant'];
  text: string;
  toolbar: React.ReactNode;
}) => {
  const shouldAutoFocus =
    Platform.OS !== 'web' && autoFocusOnNative && !isTextInputDisabled;

  const isVirtualKeyboardVisible = useVirtualKeyboardVisible(isTextareaFocused);
  const isComposerCompact = isVirtualKeyboardVisible;
  const showMarkdownShortcuts = showFormattingControls && isComposerCompact;
  const showInputAccessory = !isComposerCompact && !!inputAccessory;
  const showInputAction = !isComposerCompact && !!inputAction;
  const showInputControls = showInputAction || showFullscreenControl;
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  const [focusedEditor, setFocusedEditor] =
    React.useState<ComposerEditor | null>(null);

  const inlineTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const fullscreenTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const cancelPendingFullscreenOpenRef = React.useRef<(() => void) | null>(
    null
  );

  const {
    handleTextChange,
    hasSpace: hasInlineAttachmentSummarySpace,
    onContentSizeChange: handleInlineTextareaContentSizeChange,
    onScroll: handleInlineTextareaScroll,
    reset: resetInlineAttachmentSummary,
    show: showInlineAttachmentSummary,
  } = useInlineAttachmentSummary({
    attachmentCount,
    focusedEditor,
    isVirtualKeyboardVisible,
    showFullscreenControl,
    textLength: text.length,
  });

  const cancelPendingFullscreenOpen = React.useCallback(() => {
    cancelPendingFullscreenOpenRef.current?.();
    cancelPendingFullscreenOpenRef.current = null;
  }, []);

  React.useEffect(
    () => cancelPendingFullscreenOpen,
    [cancelPendingFullscreenOpen]
  );

  React.useEffect(() => {
    if (showFullscreenControl) return;
    setIsFullscreenOpen(false);
  }, [showFullscreenControl]);

  React.useEffect(() => {
    if (isOpen) return;
    cancelPendingFullscreenOpen();
    resetInlineAttachmentSummary();
    setFocusedEditor(null);
    onTextareaFocusChange(false);
    setIsFullscreenOpen(false);
  }, [
    cancelPendingFullscreenOpen,
    isOpen,
    onTextareaFocusChange,
    resetInlineAttachmentSummary,
  ]);

  const handleTextareaFocus = React.useCallback(
    (editor: ComposerEditor) => {
      if (isTextInputDisabled) return;
      setFocusedEditor(editor);
      onTextareaFocusChange(true);
    },
    [isTextInputDisabled, onTextareaFocusChange]
  );

  const setComposerText = React.useCallback(
    (nextText: string) => {
      handleTextChange(nextText);
      onChangeText(nextText);
    },
    [handleTextChange, onChangeText]
  );

  const {
    handleKeyDown: handleInlineKeyDown,
    handleSelectionChange: handleInlineSelectionChange,
    handleShortcut: handleInlineMarkdownShortcut,
    handleShortcutPressStart: handleInlineMarkdownShortcutPressStart,
    handleTouchStart: handleInlineTextareaTouchStart,
    readSelection: readInlineSelection,
  } = useMarkdownTextareaShortcuts({
    disabled: isTextInputDisabled,
    maxLength: COMPOSER_TEXT_MAX_LENGTH,
    setText: setComposerText,
    text,
    textareaRef: inlineTextareaRef,
  });

  const {
    handleKeyDown: handleFullscreenKeyDown,
    handleSelectionChange: handleFullscreenSelectionChange,
    handleShortcut: handleFullscreenMarkdownShortcut,
    handleShortcutPressStart: handleFullscreenMarkdownShortcutPressStart,
    handleTouchStart: handleFullscreenTextareaTouchStart,
    setSelection: setFullscreenSelection,
  } = useMarkdownTextareaShortcuts({
    disabled: isTextInputDisabled,
    maxLength: COMPOSER_TEXT_MAX_LENGTH,
    setText: setComposerText,
    text,
    textareaRef: fullscreenTextareaRef,
  });

  const handleTextareaBlur = React.useCallback(
    (editor: ComposerEditor, event: unknown) => {
      setFocusedEditor((current) => (current === editor ? null : current));

      if (isTextInputDisabled) {
        onTextareaFocusChange(false);
        return;
      }

      const rawText = readTextareaBlurText(event, text);
      const nextText = rawText.trim();
      if (nextText !== rawText || nextText !== text) setComposerText(nextText);
      onTextareaFocusChange(false);
    },
    [isTextInputDisabled, onTextareaFocusChange, setComposerText, text]
  );

  const handleInlineTextareaFocus = React.useCallback(() => {
    handleTextareaFocus('inline');
  }, [handleTextareaFocus]);

  const handleFullscreenTextareaFocus = React.useCallback(() => {
    handleTextareaFocus('fullscreen');
  }, [handleTextareaFocus]);

  const handleInlineTextareaBlur = React.useCallback(
    (event: unknown) => {
      handleTextareaBlur('inline', event);
    },
    [handleTextareaBlur]
  );

  const handleFullscreenTextareaBlur = React.useCallback(
    (event: unknown) => {
      handleTextareaBlur('fullscreen', event);
    },
    [handleTextareaBlur]
  );

  const handleOpenFullscreen = React.useCallback(() => {
    if (isTextInputDisabled) return;
    setFullscreenSelection(readInlineSelection());
    cancelPendingFullscreenOpen();

    if (Platform.OS !== 'web' && isVirtualKeyboardVisible) {
      let opened = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let subscription: { remove: () => void } | null = null;

      const open = () => {
        if (opened) return;
        opened = true;
        subscription?.remove();
        if (timeout) clearTimeout(timeout);
        cancelPendingFullscreenOpenRef.current = null;
        setIsFullscreenOpen(true);
      };

      subscription = Keyboard.addListener('keyboardDidHide', open);
      timeout = setTimeout(open, 500);

      cancelPendingFullscreenOpenRef.current = () => {
        opened = true;
        subscription?.remove();
        if (timeout) clearTimeout(timeout);
      };

      Keyboard.dismiss();
      return;
    }

    setIsFullscreenOpen(true);
  }, [
    cancelPendingFullscreenOpen,
    isTextInputDisabled,
    isVirtualKeyboardVisible,
    readInlineSelection,
    setFullscreenSelection,
  ]);

  const handleCompactAttachmentSummaryPress = React.useCallback(() => {
    if (isTextInputDisabled) return;
    readInlineSelection();
    (inlineTextareaRef.current as TextareaBlurHandle | null)?.blur?.();
    setFocusedEditor(null);
    if (Platform.OS !== 'web') Keyboard.dismiss();
    onTextareaFocusChange(false);
  }, [isTextInputDisabled, onTextareaFocusChange, readInlineSelection]);

  return (
    <React.Fragment>
      <View className="mx-auto max-h-full max-w-lg min-h-0 w-full">
        <View className="max-h-full min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
          <View className="overflow-hidden min-h-0 border-border-secondary border-continuous rounded-xl bg-input border shrink">
            {showInputAccessory && (
              <View className="border-b border-border-secondary border-continuous">
                {inputAccessory}
              </View>
            )}
            <View className="relative">
              <Textarea
                ref={inlineTextareaRef}
                autoFocus={shouldAutoFocus}
                maxLength={COMPOSER_TEXT_MAX_LENGTH}
                maxRows={INLINE_TEXTAREA_MAX_ROWS}
                minRows={1}
                onBlur={handleInlineTextareaBlur}
                onChangeText={setComposerText}
                onContentSizeChange={handleInlineTextareaContentSizeChange}
                onFocus={handleInlineTextareaFocus}
                onKeyDown={handleInlineKeyDown}
                onScroll={handleInlineTextareaScroll}
                onSelectionChange={handleInlineSelectionChange}
                onTouchStart={handleInlineTextareaTouchStart}
                pasteRichTextAsMarkdown
                placeholder={placeholder}
                readOnly={isTextInputDisabled}
                size="sm"
                value={text}
                className={cn(
                  'border-0 bg-transparent',
                  isTextInputDisabled && 'opacity-50',
                  hasInlineAttachmentSummarySpace && 'min-h-16 pb-8',
                  showInputAction && showFullscreenControl && 'pr-44',
                  showInputAction && !showFullscreenControl && 'pr-32',
                  !showInputAction && showFullscreenControl && 'pr-14'
                )}
              />
              {showInputControls && (
                <View className="absolute right-1 top-1 flex-row gap-1">
                  {showInputAction && inputAction}
                  {showFullscreenControl && (
                    <Button
                      accessibilityLabel="Open fullscreen composer"
                      className="h-8 w-8 rounded-lg"
                      disabled={isTextInputDisabled}
                      onPress={handleOpenFullscreen}
                      size="icon"
                      variant="ghost"
                      wrapperClassName="rounded-lg border-continuous"
                    >
                      <Icon
                        className="text-muted-foreground"
                        icon={CornersOut}
                        size={20}
                      />
                    </Button>
                  )}
                </View>
              )}
              {showInlineAttachmentSummary && (
                <Animated.View
                  className="absolute bottom-1 right-3 max-w-[75%]"
                  entering={animation(FadeIn)}
                  exiting={animation(FadeOut)}
                >
                  <Pressable
                    accessibilityLabel="Dismiss keyboard"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleCompactAttachmentSummaryPress}
                  >
                    <AttachmentSummary
                      count={attachmentCount}
                      variant="compact"
                    />
                  </Pressable>
                </Animated.View>
              )}
            </View>
            {isComposerCompact ? null : filePreview}
          </View>
          <View className="flex-row px-4 gap-3 items-center shrink-0">
            <View className="flex-1 flex-row gap-2 items-center">
              {showMarkdownShortcuts ? (
                <MarkdownShortcutToolbar
                  disabled={isTextInputDisabled}
                  onShortcut={handleInlineMarkdownShortcut}
                  onShortcutPressStart={handleInlineMarkdownShortcutPressStart}
                />
              ) : (
                toolbar
              )}
            </View>
            <Button
              className="active:opacity-90 web:hover:opacity-90"
              disabled={isBusy || isSubmitting || !hasContent}
              onPress={onSubmit}
              size="xs"
              style={logColor ? { backgroundColor: logColor } : undefined}
              variant={submitVariant}
            >
              {isSubmitting ? (
                <Spinner color={logColor ? 'white' : undefined} />
              ) : (
                <Text className={submitTextClassName}>{submitLabel}</Text>
              )}
            </Button>
          </View>
        </View>
      </View>
      <Sheet
        className="h-full"
        onDismiss={() => setIsFullscreenOpen(false)}
        open={isOpen && isFullscreenOpen && showFullscreenControl}
        portalName={fullscreenPortalName}
        width="editor"
      >
        <Page className="flex-col overflow-hidden max-h-full min-h-0 bg-popover">
          <View className="flex-1 mx-auto max-h-full max-w-4xl min-h-0 w-full">
            <View className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
              <View className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border">
                <Textarea
                  ref={fullscreenTextareaRef}
                  autoFocus
                  maxLength={COMPOSER_TEXT_MAX_LENGTH}
                  onBlur={handleFullscreenTextareaBlur}
                  onChangeText={setComposerText}
                  onFocus={handleFullscreenTextareaFocus}
                  onKeyDown={handleFullscreenKeyDown}
                  onSelectionChange={handleFullscreenSelectionChange}
                  onTouchStart={handleFullscreenTextareaTouchStart}
                  pasteRichTextAsMarkdown
                  placeholder={placeholder}
                  readOnly={isTextInputDisabled}
                  style={Platform.OS === 'web' ? { height: '100%' } : undefined}
                  value={text}
                  className={cn(
                    'min-h-full flex-1 border-0 rounded-2xl bg-transparent',
                    isTextInputDisabled && 'opacity-50'
                  )}
                />
              </View>
              <View className="flex-row px-4 gap-3 items-center shrink-0">
                <View className="flex-1 flex-row gap-2 items-center">
                  {showFormattingControls && (
                    <MarkdownShortcutToolbar
                      disabled={isTextInputDisabled}
                      onShortcut={handleFullscreenMarkdownShortcut}
                      onShortcutPressStart={
                        handleFullscreenMarkdownShortcutPressStart
                      }
                    />
                  )}
                </View>
                <Button
                  onPress={() => setIsFullscreenOpen(false)}
                  size="xs"
                  variant="secondary"
                >
                  <Text>Done</Text>
                </Button>
              </View>
            </View>
          </View>
        </Page>
      </Sheet>
    </React.Fragment>
  );
};

function useInlineAttachmentSummary({
  attachmentCount,
  focusedEditor,
  isVirtualKeyboardVisible,
  showFullscreenControl,
  textLength,
}: {
  attachmentCount: number;
  focusedEditor: ComposerEditor | null;
  isVirtualKeyboardVisible: boolean;
  showFullscreenControl: boolean;
  textLength: number;
}) {
  const [isScrolledToBottom, setIsScrolledToBottom] = React.useState(true);
  const isScrolledToBottomRef = React.useRef(true);
  const metricsRef = React.useRef<TextareaScrollMetrics>({});
  const suppressNotBottomRef = React.useRef(false);
  const clearSuppressNotBottomRef = React.useRef<(() => void) | null>(null);

  const clearSuppressNotBottom = React.useCallback(() => {
    clearSuppressNotBottomRef.current?.();
  }, []);

  const suppressNotBottomForAutoScroll = React.useCallback(() => {
    suppressNotBottomRef.current = true;
    clearSuppressNotBottom();

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        suppressNotBottomRef.current = false;
        clearSuppressNotBottomRef.current = null;
      });
    });

    clearSuppressNotBottomRef.current = () => {
      cancelAnimationFrame(frame);
      suppressNotBottomRef.current = false;
      clearSuppressNotBottomRef.current = null;
    };
  }, [clearSuppressNotBottom]);

  const updateScrollMetrics = React.useCallback(
    (metrics: TextareaScrollMetrics) => {
      const nextMetrics = { ...metricsRef.current, ...metrics };
      metricsRef.current = nextMetrics;

      setIsScrolledToBottom((current) => {
        const next = isTextareaScrolledToBottom(nextMetrics);
        if (!next && current && suppressNotBottomRef.current) return current;
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

  const handleTextChange = React.useCallback(
    (nextText: string) => {
      if (isScrolledToBottomRef.current && nextText.length >= textLength) {
        suppressNotBottomForAutoScroll();
      }
    },
    [suppressNotBottomForAutoScroll, textLength]
  );

  const reset = React.useCallback(() => {
    clearSuppressNotBottom();
    metricsRef.current = {};
    isScrolledToBottomRef.current = true;
    setIsScrolledToBottom(true);
  }, [clearSuppressNotBottom]);

  React.useEffect(() => clearSuppressNotBottom, [clearSuppressNotBottom]);

  const hasSpace =
    isVirtualKeyboardVisible &&
    focusedEditor === 'inline' &&
    (showFullscreenControl || attachmentCount > 0);

  return React.useMemo(
    () => ({
      handleTextChange,
      hasSpace,
      onContentSizeChange: handleContentSizeChange,
      onScroll: handleScroll,
      reset,
      show: hasSpace && isScrolledToBottom,
    }),
    [
      handleContentSizeChange,
      handleScroll,
      handleTextChange,
      hasSpace,
      isScrolledToBottom,
      reset,
    ]
  );
}

function isTextareaScrolledToBottom(metrics: TextareaScrollMetrics) {
  const contentHeight = metrics.contentHeight ?? 0;
  if (contentHeight <= 0) return true;

  const viewportHeight =
    metrics.viewportHeight ??
    Math.min(INLINE_TEXTAREA_MAX_HEIGHT, contentHeight);

  if (contentHeight <= viewportHeight + TEXTAREA_SCROLL_BOTTOM_TOLERANCE) {
    return true;
  }

  return (
    (metrics.offsetY ?? 0) + viewportHeight >=
    contentHeight - TEXTAREA_SCROLL_BOTTOM_TOLERANCE
  );
}

function getTextareaContentHeightFromEvent(event: unknown) {
  const nativeEvent = getObjectProperty(event, 'nativeEvent');
  const contentSize = getObjectProperty(nativeEvent, 'contentSize');
  return getNumberProperty(contentSize, 'height');
}

function getTextareaScrollMetricsFromEvent(
  event: unknown
): TextareaScrollMetrics {
  const currentTarget = getObjectProperty(event, 'currentTarget');
  const scrollHeight = getNumberProperty(currentTarget, 'scrollHeight');
  const scrollTop = getNumberProperty(currentTarget, 'scrollTop');
  const clientHeight = getNumberProperty(currentTarget, 'clientHeight');

  if (
    scrollHeight !== undefined ||
    scrollTop !== undefined ||
    clientHeight !== undefined
  ) {
    return {
      contentHeight: scrollHeight,
      offsetY: scrollTop,
      viewportHeight: clientHeight,
    };
  }

  const nativeEvent = getObjectProperty(event, 'nativeEvent');
  const contentOffset = getObjectProperty(nativeEvent, 'contentOffset');
  return { offsetY: getNumberProperty(contentOffset, 'y') };
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
