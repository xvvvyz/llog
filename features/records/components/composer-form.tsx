import { AttachmentSummary } from '@/features/records/components/attachment-summary';
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
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';
import * as markdownShortcuts from '@/features/records/lib/markdown-shortcuts';

import {
  CornersOut,
  LinkSimple,
  ListBullets,
  ListNumbers,
  TextB,
  TextItalic,
} from 'phosphor-react-native';

const COMPOSER_TEXT_MAX_LENGTH = 10240;
type TextSelection = { end: number; start: number };

type TextareaSelectionChangeEvent = {
  nativeEvent: { selection: TextSelection };
};

type ButtonTouchStartEvent = Parameters<
  NonNullable<React.ComponentPropsWithoutRef<typeof Button>['onTouchStart']>
>[0];

type WebPreventableTouchEvent = {
  nativeEvent?: { preventDefault?: () => void };
  preventDefault?: () => void;
};

type MarkdownShortcutItem = {
  accessibilityLabel: string;
  icon: React.ComponentType<PhosphorIconProps>;
  shortcut: markdownShortcuts.MarkdownShortcut;
};

const MARKDOWN_SHORTCUTS: MarkdownShortcutItem[] = [
  { accessibilityLabel: 'Bold', icon: TextB, shortcut: 'bold' },
  { accessibilityLabel: 'Italic', icon: TextItalic, shortcut: 'italic' },
  { accessibilityLabel: 'Link', icon: LinkSimple, shortcut: 'link' },
  {
    accessibilityLabel: 'Bulleted list',
    icon: ListBullets,
    shortcut: 'unordered-list',
  },
  {
    accessibilityLabel: 'Numbered list',
    icon: ListNumbers,
    shortcut: 'ordered-list',
  },
];

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
  submitLabel: string;
  submitTextClassName?: string;
  submitVariant?: React.ComponentPropsWithoutRef<typeof Button>['variant'];
  text: string;
  toolbar: React.ReactNode;
}) => {
  const shouldAutoFocus =
    Platform.OS !== 'web' && autoFocusOnNative && !isTextInputDisabled;

  const isVirtualKeyboardVisible = useVirtualKeyboardVisible(isTextareaFocused);
  const isComposerCompact = isTextareaFocused && isVirtualKeyboardVisible;
  const showInputAccessory = !isComposerCompact && !!inputAccessory;
  const showInputAction = !isComposerCompact && !!inputAction;
  const showFullscreenAction = !isTextareaFocused;
  const showInputActionOverlay = showInputAction || showFullscreenAction;
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  const fullscreenTextareaRef =
    React.useRef<React.ComponentRef<typeof Textarea>>(null);

  const latestTextRef = React.useRef(text);

  const fullscreenSelectionRef = React.useRef<TextSelection>({
    end: text.length,
    start: text.length,
  });

  const lastSelectedTextRangeRef = React.useRef<TextSelection | null>(null);

  React.useEffect(() => {
    latestTextRef.current = text;
  }, [text]);

  React.useEffect(() => {
    if (isOpen) return;
    onTextareaFocusChange(false);
    setIsFullscreenOpen(false);
  }, [isOpen, onTextareaFocusChange]);

  const handleTextareaFocus = React.useCallback(() => {
    if (isTextInputDisabled) return;
    onTextareaFocusChange(true);
  }, [isTextInputDisabled, onTextareaFocusChange]);

  const setComposerText = React.useCallback(
    (nextText: string) => {
      latestTextRef.current = nextText;
      onChangeText(nextText);
    },
    [onChangeText]
  );

  const handleTextareaBlur = React.useCallback(
    (event: unknown) => {
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

  const handleFullscreenSelectionChange = React.useCallback(
    (event: TextareaSelectionChangeEvent) => {
      const selection = event.nativeEvent.selection;
      fullscreenSelectionRef.current = selection;

      if (selection.start !== selection.end) {
        lastSelectedTextRangeRef.current = selection;
      }
    },
    []
  );

  const handleFullscreenTextareaTouchStart = React.useCallback(() => {
    lastSelectedTextRangeRef.current = null;
  }, []);

  const readFullscreenTextareaSelection = React.useCallback(() => {
    const textarea = fullscreenTextareaRef.current as unknown as {
      selectionEnd?: number;
      selectionStart?: number;
    } | null;

    if (
      typeof textarea?.selectionStart !== 'number' ||
      typeof textarea.selectionEnd !== 'number'
    ) {
      return;
    }

    const selection = {
      end: textarea.selectionEnd,
      start: textarea.selectionStart,
    };

    fullscreenSelectionRef.current = selection;

    if (selection.start !== selection.end) {
      lastSelectedTextRangeRef.current = selection;
    }
  }, []);

  const handleMarkdownShortcutTouchStart = React.useCallback(
    (event: ButtonTouchStartEvent) => {
      readFullscreenTextareaSelection();
      // Mobile web can collapse textarea selection when a toolbar button is
      // touched, so capture the DOM range before the eventual button press.
      const preventableEvent = event as unknown as WebPreventableTouchEvent;
      preventableEvent.preventDefault?.();
      preventableEvent.nativeEvent?.preventDefault?.();
    },
    [readFullscreenTextareaSelection]
  );

  const restoreFullscreenSelection = React.useCallback(
    ({ end, start }: TextSelection) => {
      requestAnimationFrame(() => {
        const textarea = fullscreenTextareaRef.current as unknown as {
          focus?: () => void;
          setNativeProps?: (props: { selection: TextSelection }) => void;
          setSelectionRange?: (start: number, end: number) => void;
        } | null;

        textarea?.focus?.();

        if (textarea?.setSelectionRange) {
          textarea.setSelectionRange(start, end);
          return;
        }

        textarea?.setNativeProps?.({ selection: { end, start } });
      });
    },
    []
  );

  const handleMarkdownShortcut = React.useCallback(
    (shortcut: markdownShortcuts.MarkdownShortcut) => {
      if (isTextInputDisabled) return;
      const currentText = latestTextRef.current;
      const currentSelection = fullscreenSelectionRef.current;

      const selection =
        currentSelection.start === currentSelection.end
          ? (lastSelectedTextRangeRef.current ?? currentSelection)
          : currentSelection;

      const edit = markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: Math.min(selection.end, currentText.length),
        selectionStart: Math.min(selection.start, currentText.length),
        shortcut,
        text: currentText,
      });

      if (edit.text.length > COMPOSER_TEXT_MAX_LENGTH) return;
      setComposerText(edit.text);

      fullscreenSelectionRef.current = {
        end: edit.selectionEnd,
        start: edit.selectionStart,
      };

      lastSelectedTextRangeRef.current = null;

      restoreFullscreenSelection({
        end: edit.selectionEnd,
        start: edit.selectionStart,
      });
    },
    [isTextInputDisabled, restoreFullscreenSelection, setComposerText]
  );

  const textareaPaddingClassName = showInputAction
    ? showFullscreenAction
      ? 'pr-44'
      : 'pr-32'
    : showFullscreenAction
      ? 'pr-14'
      : undefined;

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
                autoFocus={shouldAutoFocus}
                maxLength={COMPOSER_TEXT_MAX_LENGTH}
                maxRows={7}
                minRows={1}
                onBlur={handleTextareaBlur}
                onChangeText={setComposerText}
                onFocus={handleTextareaFocus}
                placeholder={placeholder}
                readOnly={isTextInputDisabled}
                size="sm"
                value={text}
                className={cn(
                  'border-0 bg-transparent',
                  isTextInputDisabled && 'opacity-50',
                  textareaPaddingClassName
                )}
              />
              {showInputActionOverlay && (
                <View className="absolute right-1 top-1 flex-row gap-1">
                  {showInputAction && inputAction}
                  {showFullscreenAction && (
                    <Button
                      className="h-8 w-8 rounded-lg"
                      disabled={isTextInputDisabled}
                      onPress={() => setIsFullscreenOpen(true)}
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
            </View>
            {isComposerCompact ? null : filePreview}
          </View>
          <View className="flex-row px-4 gap-3 items-center shrink-0">
            <View className="flex-1 flex-row gap-2 items-center">
              {isComposerCompact ? (
                <AttachmentSummary count={attachmentCount} />
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
        open={isOpen && isFullscreenOpen}
        portalName={fullscreenPortalName}
      >
        <Page className="flex-col overflow-hidden max-h-full min-h-0 bg-popover">
          <View className="flex-1 mx-auto max-h-full max-w-lg min-h-0 w-full">
            <View className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
              <View className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border">
                <Textarea
                  ref={fullscreenTextareaRef}
                  autoFocus
                  maxLength={COMPOSER_TEXT_MAX_LENGTH}
                  onBlur={handleTextareaBlur}
                  onChangeText={setComposerText}
                  onFocus={handleTextareaFocus}
                  onSelectionChange={handleFullscreenSelectionChange}
                  onTouchStart={handleFullscreenTextareaTouchStart}
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
                  {MARKDOWN_SHORTCUTS.map((item) => (
                    <Button
                      key={item.shortcut}
                      accessibilityLabel={item.accessibilityLabel}
                      disabled={isTextInputDisabled}
                      onPress={() => handleMarkdownShortcut(item.shortcut)}
                      onTouchStart={handleMarkdownShortcutTouchStart}
                      size="icon-xs"
                      variant="secondary"
                    >
                      <Icon icon={item.icon} />
                    </Button>
                  ))}
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
