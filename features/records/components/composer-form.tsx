import { AttachmentSummary } from '@/features/records/components/attachment-summary';
import { MarkdownShortcutToolbar } from '@/features/records/components/markdown-shortcut-toolbar';
import { useMarkdownTextareaShortcuts } from '@/features/records/hooks/use-markdown-textarea-shortcuts';
import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { useVirtualKeyboardVisible } from '@/hooks/use-virtual-keyboard-visible';
import { animation } from '@/lib/animation';
import { cn } from '@/lib/cn';
import { dismissKeyboard } from '@/lib/keyboard';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { KeyboardDismissLayer } from '@/ui/keyboard-dismiss-layer';
import { Page } from '@/ui/page';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { CornersOut } from 'phosphor-react-native';
import * as React from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as inlineAttachmentSummary from '@/features/records/hooks/use-inline-attachment-summary';

const COMPOSER_TEXT_MAX_LENGTH = 10240;
const INLINE_TEXTAREA_ACCESSORY_MIN_ROWS = 2;
const INLINE_TEXTAREA_FULLSCREEN_PADDING_RIGHT = 48;
const INLINE_TEXTAREA_INPUT_ACTION_PADDING_RIGHT = 128;
const INLINE_TEXTAREA_FULL_CONTROLS_PADDING_RIGHT = 160;
type TextareaBlurHandle = { blur?: () => void };

export const ComposerForm = ({
  attachmentCount,
  hasContent,
  isBusy,
  isOpen,
  isSubmitting,
  isTextInputDisabled = false,
  isTextareaFocused,
  logColorClassName,
  logColorInteractiveClassName,
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
  hasContent: boolean;
  isBusy: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  isTextInputDisabled?: boolean;
  isTextareaFocused: boolean;
  logColorClassName?: string;
  logColorInteractiveClassName?: string;
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
  const isVirtualKeyboardVisible = useVirtualKeyboardVisible(isTextareaFocused);
  const isComposerCompact = isVirtualKeyboardVisible;
  const showInputAccessory = !isComposerCompact && !!inputAccessory;
  const showInputAction = !isComposerCompact && !!inputAction;
  const showInputControls = showInputAction || showFullscreenControl;
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  const [focusedEditor, setFocusedEditor] =
    React.useState<inlineAttachmentSummary.ComposerEditor | null>(null);

  const inlineTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const fullscreenTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const cancelPendingFullscreenOpenRef = React.useRef<(() => void) | null>(
    null
  );

  const {
    hasSpace: hasInlineAttachmentSummarySpace,
    onContentSizeChange: handleInlineTextareaContentSizeChange,
    onFocus: handleInlineTextareaSummaryFocus,
    onLayout: handleInlineTextareaLayout,
    onScroll: handleInlineTextareaScroll,
    reset: resetInlineAttachmentSummary,
    show: showInlineAttachmentSummary,
  } = inlineAttachmentSummary.useInlineAttachmentSummary({
    attachmentCount,
    focusedEditor,
    isTextareaFocused,
    isVirtualKeyboardVisible,
    showFullscreenControl,
    text,
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
    (editor: inlineAttachmentSummary.ComposerEditor) => {
      if (isTextInputDisabled) return;
      setFocusedEditor(editor);
      onTextareaFocusChange(true);
    },
    [isTextInputDisabled, onTextareaFocusChange]
  );

  const {
    handleKeyDown: handleInlineKeyDown,
    handleSelectionChange: handleInlineSelectionChange,
    handleTouchStart: handleInlineTextareaTouchStart,
    readSelection: readInlineSelection,
  } = useMarkdownTextareaShortcuts({
    disabled: isTextInputDisabled,
    maxLength: COMPOSER_TEXT_MAX_LENGTH,
    setText: onChangeText,
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
    setText: onChangeText,
    text,
    textareaRef: fullscreenTextareaRef,
  });

  const handleTextareaBlur = React.useCallback(
    (editor: inlineAttachmentSummary.ComposerEditor, event: unknown) => {
      setFocusedEditor((current) => (current === editor ? null : current));

      if (isTextInputDisabled) {
        onTextareaFocusChange(false);
        return;
      }

      const rawText = readTextareaBlurText(event, text);
      const nextText = rawText.trim();
      if (nextText !== rawText || nextText !== text) onChangeText(nextText);
      onTextareaFocusChange(false);
    },
    [isTextInputDisabled, onTextareaFocusChange, onChangeText, text]
  );

  const handleInlineTextareaFocus = React.useCallback(() => {
    handleInlineTextareaSummaryFocus();
    handleTextareaFocus('inline');
  }, [handleInlineTextareaSummaryFocus, handleTextareaFocus]);

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

      dismissKeyboard();
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

  const blurComposerEditor = React.useCallback(
    (editor: inlineAttachmentSummary.ComposerEditor) => {
      const textareaRef =
        editor === 'fullscreen' ? fullscreenTextareaRef : inlineTextareaRef;

      (textareaRef.current as TextareaBlurHandle | null)?.blur?.();
      setFocusedEditor(null);
      if (Platform.OS !== 'web') dismissKeyboard();
      onTextareaFocusChange(false);
    },
    [onTextareaFocusChange]
  );

  const handleCompactAttachmentSummaryPress = React.useCallback(() => {
    if (isTextInputDisabled) return;
    readInlineSelection();
    blurComposerEditor('inline');
  }, [blurComposerEditor, isTextInputDisabled, readInlineSelection]);

  const handleDismissFocusedTextarea = React.useCallback(() => {
    if (Platform.OS === 'web' || !isTextareaFocused) return;
    blurComposerEditor(focusedEditor ?? 'inline');
  }, [blurComposerEditor, focusedEditor, isTextareaFocused]);

  const showInlineKeyboardDismissLayer =
    Platform.OS !== 'web' &&
    isTextareaFocused &&
    focusedEditor !== 'fullscreen';

  const showFullscreenKeyboardDismissLayer =
    Platform.OS !== 'web' &&
    isTextareaFocused &&
    focusedEditor === 'fullscreen';

  const inlineTextareaMinRows = hasInlineAttachmentSummarySpace
    ? INLINE_TEXTAREA_ACCESSORY_MIN_ROWS
    : 1;

  const inlineTextareaNativeStyle =
    Platform.OS === 'web'
      ? undefined
      : {
          ...(hasInlineAttachmentSummarySpace
            ? {
                paddingBottom:
                  inlineAttachmentSummary.INLINE_TEXTAREA_ACCESSORY_BOTTOM_PADDING,
              }
            : {}),
          ...(showInputAction && showFullscreenControl
            ? { paddingRight: INLINE_TEXTAREA_FULL_CONTROLS_PADDING_RIGHT }
            : showInputAction
              ? { paddingRight: INLINE_TEXTAREA_INPUT_ACTION_PADDING_RIGHT }
              : showFullscreenControl
                ? { paddingRight: INLINE_TEXTAREA_FULLSCREEN_PADDING_RIGHT }
                : {}),
        };

  return (
    <React.Fragment>
      <View
        className="relative mx-auto max-h-full max-w-lg min-h-0 w-full"
        pointerEvents="box-none"
      >
        {showInlineKeyboardDismissLayer && (
          <KeyboardDismissLayer onPress={handleDismissFocusedTextarea} />
        )}
        <View
          className="max-h-full min-h-0 p-4 pb-4 gap-3 md:p-4"
          pointerEvents="box-none"
        >
          <View
            className="overflow-hidden min-h-0 border-border-secondary border-continuous rounded-xl bg-input border shrink"
            pointerEvents="box-none"
          >
            {showInputAccessory && inputAccessory}
            <View className="relative -my-px" pointerEvents="box-none">
              <Textarea
                ref={inlineTextareaRef}
                maxLength={COMPOSER_TEXT_MAX_LENGTH}
                maxRows={inlineAttachmentSummary.INLINE_TEXTAREA_MAX_ROWS}
                minRows={inlineTextareaMinRows}
                onBlur={handleInlineTextareaBlur}
                onChangeText={onChangeText}
                onContentSizeChange={handleInlineTextareaContentSizeChange}
                onFocus={handleInlineTextareaFocus}
                onKeyDown={handleInlineKeyDown}
                onLayout={handleInlineTextareaLayout}
                onScroll={handleInlineTextareaScroll}
                onSelectionChange={handleInlineSelectionChange}
                onTouchStart={handleInlineTextareaTouchStart}
                pasteRichTextAsMarkdown
                placeholder={placeholder}
                readOnly={isTextInputDisabled}
                size="sm"
                style={inlineTextareaNativeStyle}
                value={text}
                className={cn(
                  'border-0 bg-transparent',
                  isTextInputDisabled && 'opacity-50',
                  hasInlineAttachmentSummarySpace && 'web:min-h-16 web:pb-8',
                  showInputAction && showFullscreenControl && 'web:pr-40',
                  showInputAction && !showFullscreenControl && 'web:pr-32',
                  !showInputAction && showFullscreenControl && 'web:pr-12'
                )}
              />
              {showInputControls && (
                <View
                  className="absolute right-1 top-1 flex-row -mr-px"
                  pointerEvents="box-none"
                >
                  {showInputAction && inputAction}
                  {showFullscreenControl && (
                    <Button
                      accessibilityLabel="Open fullscreen composer"
                      disabled={isTextInputDisabled}
                      onPress={handleOpenFullscreen}
                      size="icon-xs"
                      variant="ghost"
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
          <View
            className="flex-row px-4 gap-3 items-center shrink-0"
            pointerEvents="box-none"
          >
            <View
              className="flex-1 flex-row gap-2 items-center"
              pointerEvents="box-none"
            >
              {toolbar}
            </View>
            <Button
              className={logColorClassName}
              disabled={isBusy || isSubmitting || !hasContent}
              onPress={onSubmit}
              size="xs"
              variant={submitVariant}
              interactiveClassName={
                logColorInteractiveClassName
                  ? cn(
                      'active:opacity-90 web:hover:opacity-90',
                      logColorInteractiveClassName
                    )
                  : undefined
              }
            >
              {isSubmitting ? (
                <Spinner color={logColorClassName ? 'white' : undefined} />
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
        <Page
          className="flex-col overflow-hidden max-h-full min-h-0 bg-popover"
          pointerEvents="box-none"
        >
          <View
            className="relative flex-1 mx-auto max-h-full max-w-4xl min-h-0 w-full"
            pointerEvents="box-none"
          >
            {showFullscreenKeyboardDismissLayer && (
              <KeyboardDismissLayer onPress={handleDismissFocusedTextarea} />
            )}
            <View
              className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4"
              pointerEvents="box-none"
            >
              <View
                className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border"
                pointerEvents="box-none"
              >
                <Textarea
                  ref={fullscreenTextareaRef}
                  fill
                  maxLength={COMPOSER_TEXT_MAX_LENGTH}
                  onBlur={handleFullscreenTextareaBlur}
                  onChangeText={onChangeText}
                  onFocus={handleFullscreenTextareaFocus}
                  onKeyDown={handleFullscreenKeyDown}
                  onSelectionChange={handleFullscreenSelectionChange}
                  onTouchStart={handleFullscreenTextareaTouchStart}
                  pasteRichTextAsMarkdown
                  placeholder={placeholder}
                  readOnly={isTextInputDisabled}
                  value={text}
                  className={cn(
                    'border-0 rounded-2xl bg-transparent',
                    isTextInputDisabled && 'opacity-50'
                  )}
                />
              </View>
              <View
                className="flex-row px-4 gap-3 items-center shrink-0"
                pointerEvents="box-none"
              >
                <View
                  className="flex-1 flex-row gap-2 items-center"
                  pointerEvents="box-none"
                >
                  {showFormattingControls && (
                    <MarkdownShortcutToolbar
                      disabled={isTextInputDisabled}
                      onShortcut={handleFullscreenMarkdownShortcut}
                      showAllBreakpoint="xs"
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
