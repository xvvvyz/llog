import * as React from 'react';
import { Platform } from 'react-native';

export type TextSelection = { end: number; start: number };

type TextareaSelectionChangeEvent = {
  nativeEvent?: { selection?: Partial<TextSelection> };
};

export type TextareaSelectionHandle = {
  focus?: (options?: { preventScroll?: boolean }) => void;
  selectionEnd?: number;
  selectionStart?: number;
  setNativeProps?: (props: { selection: TextSelection }) => void;
  setSelectionRange?: (start: number, end: number) => void;
};

export const useTextareaSelection = ({
  text,
  textareaRef,
}: {
  text: string;
  textareaRef: { current: unknown };
}) => {
  const selectionRef = React.useRef<TextSelection>({
    end: text.length,
    start: text.length,
  });

  const getTextareaHandle = React.useCallback(
    () => textareaRef.current as TextareaSelectionHandle | null,
    [textareaRef]
  );

  const getSelection = React.useCallback(() => selectionRef.current, []);

  const setSelection = React.useCallback(
    (selection: Partial<TextSelection>) => {
      if (
        typeof selection.start !== 'number' ||
        typeof selection.end !== 'number'
      ) {
        return;
      }

      selectionRef.current = { end: selection.end, start: selection.start };
      return selectionRef.current;
    },
    []
  );

  const readSelection = React.useCallback(() => {
    const textarea = getTextareaHandle();

    if (
      typeof textarea?.selectionStart === 'number' &&
      typeof textarea.selectionEnd === 'number'
    ) {
      setSelection({
        end: textarea.selectionEnd,
        start: textarea.selectionStart,
      });
    }

    return selectionRef.current;
  }, [getTextareaHandle, setSelection]);

  const restoreSelection = React.useCallback(
    (selection: TextSelection) => {
      setSelection(selection);

      requestAnimationFrame(() => {
        const textarea = getTextareaHandle();

        if (Platform.OS === 'web') {
          try {
            textarea?.focus?.({ preventScroll: true });
          } catch {
            textarea?.focus?.();
          }
        } else {
          textarea?.focus?.();
        }

        if (textarea?.setSelectionRange) {
          textarea.setSelectionRange(selection.start, selection.end);
          return;
        }

        textarea?.setNativeProps?.({ selection });
      });
    },
    [getTextareaHandle, setSelection]
  );

  const handleSelectionChange = React.useCallback(
    (event: unknown) => {
      return setSelection(
        (event as TextareaSelectionChangeEvent).nativeEvent?.selection ?? {}
      );
    },
    [setSelection]
  );

  return {
    getSelection,
    handleSelectionChange,
    readSelection,
    restoreSelection,
    setSelection,
  };
};
