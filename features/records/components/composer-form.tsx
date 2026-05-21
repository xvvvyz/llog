import { AttachmentSummary } from '@/features/records/components/attachment-summary';
import { MarkdownShortcutToolbar } from '@/features/records/components/markdown-shortcut-toolbar';
import { useMarkdownTextareaShortcuts } from '@/features/records/hooks/use-markdown-textarea-shortcuts';
import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { useVirtualKeyboardVisible } from '@/hooks/use-virtual-keyboard-visible';
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

const COMPOSER_TEXT_MAX_LENGTH = 10240;
type ComposerEditor = 'fullscreen' | 'inline';
type TextareaBlurHandle = { blur?: () => void };

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
  const showInputControls = showInputAction || showFormattingControls;
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  const [focusedEditor, setFocusedEditor] =
    React.useState<ComposerEditor | null>(null);

  const showFocusedAttachmentSummary =
    isVirtualKeyboardVisible &&
    focusedEditor === 'inline' &&
    (showFormattingControls || attachmentCount > 0);

  const inlineTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const fullscreenTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const cancelPendingFullscreenOpenRef = React.useRef<(() => void) | null>(
    null
  );

  const cancelPendingFullscreenOpen = React.useCallback(() => {
    cancelPendingFullscreenOpenRef.current?.();
    cancelPendingFullscreenOpenRef.current = null;
  }, []);

  React.useEffect(
    () => cancelPendingFullscreenOpen,
    [cancelPendingFullscreenOpen]
  );

  React.useEffect(() => {
    if (showFormattingControls) return;
    setIsFullscreenOpen(false);
  }, [showFormattingControls]);

  React.useEffect(() => {
    if (isOpen) return;
    cancelPendingFullscreenOpen();
    setFocusedEditor(null);
    onTextareaFocusChange(false);
    setIsFullscreenOpen(false);
  }, [cancelPendingFullscreenOpen, isOpen, onTextareaFocusChange]);

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
      onChangeText(nextText);
    },
    [onChangeText]
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
                maxRows={7}
                minRows={1}
                onBlur={handleInlineTextareaBlur}
                onChangeText={setComposerText}
                onFocus={handleInlineTextareaFocus}
                onKeyDown={handleInlineKeyDown}
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
                  showFocusedAttachmentSummary && 'min-h-16 pb-8',
                  showInputAction && showFormattingControls && 'pr-44',
                  showInputAction && !showFormattingControls && 'pr-32',
                  !showInputAction && showFormattingControls && 'pr-14'
                )}
              />
              {showInputControls && (
                <View className="absolute right-1 top-1 flex-row gap-1">
                  {showInputAction && inputAction}
                  {showFormattingControls && (
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
              {showFocusedAttachmentSummary && (
                <Pressable
                  accessibilityLabel="Dismiss keyboard"
                  accessibilityRole="button"
                  className="absolute bottom-1 right-3 max-w-[75%]"
                  hitSlop={8}
                  onPress={handleCompactAttachmentSummaryPress}
                >
                  <AttachmentSummary
                    count={attachmentCount}
                    variant="compact"
                  />
                </Pressable>
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
        open={isOpen && isFullscreenOpen && showFormattingControls}
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
                  <MarkdownShortcutToolbar
                    disabled={isTextInputDisabled}
                    onShortcut={handleFullscreenMarkdownShortcut}
                    onShortcutPressStart={
                      handleFullscreenMarkdownShortcutPressStart
                    }
                  />
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
