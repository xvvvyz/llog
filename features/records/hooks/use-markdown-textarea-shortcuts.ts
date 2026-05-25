import * as markdownShortcuts from '@/features/records/lib/markdown-shortcuts';
import * as React from 'react';
import { Platform } from 'react-native';
import * as textareaSelection from '@/features/records/hooks/use-textarea-selection';
import { applyTextareaEditWithUndo } from '@/ui/textarea-edit';

type WebPreventablePressStartEvent = {
  nativeEvent?: { pointerType?: string; preventDefault?: () => void };
  preventDefault?: () => void;
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { platform?: string };
};

type MarkdownTextEdit = {
  selectionEnd: number;
  selectionStart: number;
  text: string;
};

export const useMarkdownTextareaShortcuts = ({
  disabled,
  initialSelection,
  maxLength,
  setText,
  text,
  textareaRef,
}: {
  disabled?: boolean;
  initialSelection?: textareaSelection.TextSelection | null;
  maxLength: number;
  setText: (text: string) => void;
  text: string;
  textareaRef: { current: unknown };
}) => {
  const latestTextRef = React.useRef(text);
  const usesMetaKey = React.useMemo(usesMetaKeyShortcutModifier, []);

  const lastSelectedTextRangeRef =
    React.useRef<textareaSelection.TextSelection | null>(null);

  const pendingShortcutSelectionRef =
    React.useRef<textareaSelection.TextSelection | null>(null);

  const {
    getSelection,
    handleSelectionChange: handleTextareaSelectionChange,
    readSelection,
    restoreSelection,
    setSelection,
  } = textareaSelection.useTextareaSelection({ text, textareaRef });

  const getCurrentText = React.useCallback(() => {
    if (Platform.OS === 'web') {
      const textarea = textareaRef.current as HTMLTextAreaElement | null;
      if (typeof textarea?.value === 'string') return textarea.value;
    }

    return latestTextRef.current;
  }, [textareaRef]);

  React.useEffect(() => {
    if (latestTextRef.current !== text) {
      lastSelectedTextRangeRef.current = null;
      pendingShortcutSelectionRef.current = null;
    }

    latestTextRef.current = text;
  }, [text]);

  React.useEffect(() => {
    if (!initialSelection) return;
    const selection = setSelection(initialSelection);

    lastSelectedTextRangeRef.current =
      selection && selection.start !== selection.end ? selection : null;
  }, [initialSelection, setSelection]);

  const handleSelectionChange = React.useCallback(
    (event: unknown) => {
      const selection = handleTextareaSelectionChange(event);

      if (selection && selection.start !== selection.end) {
        lastSelectedTextRangeRef.current = selection;
      } else if (selection) lastSelectedTextRangeRef.current = null;
    },
    [handleTextareaSelectionChange]
  );

  const applyMarkdownEdit = React.useCallback(
    (edit: MarkdownTextEdit) => {
      if (!canApplyMarkdownEdit(edit, maxLength)) return false;

      const nextSelection = {
        end: edit.selectionEnd,
        start: edit.selectionStart,
      };

      let appliedWithTextarea = false;

      if (Platform.OS === 'web') {
        const textarea = textareaRef.current as HTMLTextAreaElement | null;

        if (textarea) {
          appliedWithTextarea = applyTextareaEditWithUndo(textarea, edit);
        }
      }

      if (!appliedWithTextarea || edit.text !== latestTextRef.current) {
        setText(edit.text);
      }

      latestTextRef.current = edit.text;
      setSelection(nextSelection);
      lastSelectedTextRangeRef.current = null;
      restoreSelection(nextSelection);
      return true;
    },
    [maxLength, restoreSelection, setSelection, setText, textareaRef]
  );

  const handleShortcut = React.useCallback(
    (shortcut: markdownShortcuts.MarkdownShortcut) => {
      if (disabled) return;
      const currentText = getCurrentText();
      const currentSelection = getSelection();
      const pendingSelection = pendingShortcutSelectionRef.current;
      pendingShortcutSelectionRef.current = null;

      const selection =
        pendingSelection ??
        (currentSelection.start === currentSelection.end
          ? (lastSelectedTextRangeRef.current ?? currentSelection)
          : currentSelection);

      const edit = markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: Math.min(selection.end, currentText.length),
        selectionStart: Math.min(selection.start, currentText.length),
        shortcut,
        text: currentText,
      });

      applyMarkdownEdit(edit);
    },
    [applyMarkdownEdit, disabled, getCurrentText, getSelection]
  );

  const handleKeyDown = React.useCallback(
    (event: unknown) => {
      const keyboardEvent = event as React.KeyboardEvent<HTMLTextAreaElement>;

      const selection = {
        end: keyboardEvent.currentTarget.selectionEnd,
        start: keyboardEvent.currentTarget.selectionStart,
      };

      if (isMarkdownEnterEvent(keyboardEvent)) {
        if (disabled) return;

        const edit = markdownShortcuts.getMarkdownEnterEdit({
          selectionEnd: selection.end,
          selectionStart: selection.start,
          text: keyboardEvent.currentTarget.value,
        });

        if (!edit || !canApplyMarkdownEdit(edit, maxLength)) return;
        keyboardEvent.preventDefault();
        setSelection(selection);
        applyMarkdownEdit(edit);
        return;
      }

      if (isMarkdownTabEvent(keyboardEvent)) {
        if (disabled) return;

        const edit = markdownShortcuts.getMarkdownTabEdit({
          selectionEnd: selection.end,
          selectionStart: selection.start,
          shiftKey: keyboardEvent.shiftKey,
          text: keyboardEvent.currentTarget.value,
        });

        if (!edit || !canApplyMarkdownEdit(edit, maxLength)) return;
        keyboardEvent.preventDefault();
        setSelection(selection);
        applyMarkdownEdit(edit);
        return;
      }

      const shortcut = markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyboardEvent.nativeEvent,
        { usesMetaKey }
      );

      if (!shortcut) return;
      if (disabled) return;

      const edit = markdownShortcuts.getMarkdownShortcutEdit({
        selectionEnd: selection.end,
        selectionStart: selection.start,
        shortcut,
        text: keyboardEvent.currentTarget.value,
      });

      if (!canApplyMarkdownEdit(edit, maxLength)) return;
      keyboardEvent.preventDefault();
      setSelection(selection);

      if (selection.start === selection.end) {
        lastSelectedTextRangeRef.current = null;
      }

      applyMarkdownEdit(edit);
    },
    [applyMarkdownEdit, disabled, maxLength, setSelection, usesMetaKey]
  );

  const handleShortcutPressStart = React.useCallback(
    (event: unknown) => {
      const selection = readSelection();
      pendingShortcutSelectionRef.current = selection;

      lastSelectedTextRangeRef.current =
        selection.start === selection.end ? null : selection;

      if (Platform.OS !== 'web') return;
      const preventableEvent = event as WebPreventablePressStartEvent;

      if (
        preventableEvent.nativeEvent?.pointerType &&
        preventableEvent.nativeEvent.pointerType !== 'mouse'
      ) {
        return;
      }

      preventableEvent.preventDefault?.();
      preventableEvent.nativeEvent?.preventDefault?.();
    },
    [readSelection]
  );

  const handleTouchStart = React.useCallback(() => {
    lastSelectedTextRangeRef.current = null;
    pendingShortcutSelectionRef.current = null;
  }, []);

  return {
    getSelection,
    handleKeyDown,
    handleSelectionChange,
    handleShortcut,
    handleShortcutPressStart,
    handleTouchStart,
    readSelection,
    setSelection,
  };
};

function usesMetaKeyShortcutModifier() {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const webNavigator = navigator as NavigatorWithUserAgentData;
  const userAgentPlatform = webNavigator.userAgentData?.platform ?? '';
  const legacyPlatform = webNavigator.platform ?? '';
  const userAgent = webNavigator.userAgent ?? '';

  return (
    isApplePlatform(userAgentPlatform) ||
    isApplePlatform(legacyPlatform) ||
    isAppleUserAgent(userAgent)
  );
}

function isApplePlatform(platform: string) {
  return /mac|ios|ipad|iphone|ipod/i.test(platform);
}

function isAppleUserAgent(userAgent: string) {
  return /iPad|iPhone|iPod/.test(userAgent);
}

function canApplyMarkdownEdit(edit: MarkdownTextEdit, maxLength: number) {
  return edit.text.length <= maxLength;
}

function isMarkdownTabEvent(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  return (
    event.key === 'Tab' &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !(event.nativeEvent as KeyboardEvent).isComposing
  );
}

function isMarkdownEnterEvent(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !(event.nativeEvent as KeyboardEvent).isComposing
  );
}
