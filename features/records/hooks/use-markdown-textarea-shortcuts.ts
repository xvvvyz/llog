import * as markdownShortcuts from '@/features/records/lib/markdown-shortcuts';
import * as React from 'react';
import { Platform } from 'react-native';
import * as textareaSelection from '@/features/records/hooks/use-textarea-selection';

type WebPreventablePressStartEvent = {
  nativeEvent?: { pointerType?: string; preventDefault?: () => void };
  preventDefault?: () => void;
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

  const lastSelectedTextRangeRef =
    React.useRef<textareaSelection.TextSelection | null>(null);

  const {
    getSelection,
    handleSelectionChange: handleTextareaSelectionChange,
    readSelection,
    restoreSelection,
    setSelection,
  } = textareaSelection.useTextareaSelection({ text, textareaRef });

  React.useEffect(() => {
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
      }
    },
    [handleTextareaSelectionChange]
  );

  const handleShortcut = React.useCallback(
    (shortcut: markdownShortcuts.MarkdownShortcut) => {
      if (disabled) return;
      const currentText = latestTextRef.current;
      const currentSelection = getSelection();

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

      if (edit.text.length > maxLength) return;
      setText(edit.text);

      const nextSelection = {
        end: edit.selectionEnd,
        start: edit.selectionStart,
      };

      setSelection(nextSelection);
      lastSelectedTextRangeRef.current = null;
      restoreSelection(nextSelection);
    },
    [disabled, getSelection, maxLength, restoreSelection, setSelection, setText]
  );

  const handleKeyDown = React.useCallback(
    (event: unknown) => {
      const keyboardEvent = event as React.KeyboardEvent<HTMLTextAreaElement>;

      const shortcut = markdownShortcuts.getMarkdownShortcutFromKeyEvent(
        keyboardEvent.nativeEvent
      );

      if (!shortcut) return;
      if (disabled) return;
      keyboardEvent.preventDefault();

      const selection = {
        end: keyboardEvent.currentTarget.selectionEnd,
        start: keyboardEvent.currentTarget.selectionStart,
      };

      setSelection(selection);

      if (selection.start === selection.end) {
        lastSelectedTextRangeRef.current = null;
      }

      handleShortcut(shortcut);
    },
    [disabled, handleShortcut, setSelection]
  );

  const handleShortcutPressStart = React.useCallback(
    (event: unknown) => {
      readSelection();
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
