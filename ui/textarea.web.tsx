import { cn } from '@/lib/cn';
import { applyTextareaEditWithUndo } from '@/ui/textarea-edit';
import { getMarkdownListEnterEdit } from '@/ui/textarea-markdown-lists';
import { getRichTextPasteEdit } from '@/ui/textarea-rich-text-paste';
import * as React from 'react';
import TextareaAutosize from 'react-textarea-autosize';

type TextareaContentSizeChangeEvent = {
  nativeEvent: { contentSize: { height: number; width: number } };
};

export const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextareaAutosize>,
  Omit<
    React.ComponentPropsWithoutRef<typeof TextareaAutosize>,
    'onChange' | 'onSelectionChange'
  > & {
    maxRows?: number;
    minRows?: number;
    numberOfLines?: number;
    onChangeText?: (text: string) => void;
    onContentSizeChange?: (event: TextareaContentSizeChangeEvent) => void;
    onLayout?: (event: {
      nativeEvent: {
        layout: { height: number; width: number; x: number; y: number };
      };
    }) => void;
    onSelectionChange?: (event: {
      nativeEvent: { selection: { end: number; start: number } };
    }) => void;
    onSubmitEditing?: () => void;
    pasteRichTextAsMarkdown?: boolean;
    size?: 'default' | 'sm';
  }
>(
  (
    {
      autoFocus,
      className,
      defaultValue,
      maxLength,
      maxRows,
      minRows,
      numberOfLines,
      onChangeText,
      onContentSizeChange,
      onKeyDown,
      onLayout,
      onPaste,
      onSelect,
      onSelectionChange,
      onSubmitEditing,
      onTouchStart,
      pasteRichTextAsMarkdown,
      placeholder,
      readOnly,
      size = 'default',
      value,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(
      value ?? defaultValue ?? ''
    );

    const textareaRef =
      React.useRef<React.ComponentRef<typeof TextareaAutosize>>(null);

    const pastePlainOnNextPasteRef = React.useRef(false);

    const pastePlainResetTimeoutRef = React.useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined);

    React.useEffect(() => {
      if (!onContentSizeChange) return;

      const frame = requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        onContentSizeChange({
          nativeEvent: {
            contentSize: {
              height: textarea.scrollHeight,
              width: textarea.scrollWidth,
            },
          },
        });
      });

      return () => cancelAnimationFrame(frame);
    }, [localValue, onContentSizeChange]);

    // react-textarea-autosize renders a DOM <textarea>, which doesn't understand
    // RN's onLayout (React warns if it's forwarded). Emit it from a
    // ResizeObserver instead so consumers still get layout metrics on web.
    React.useEffect(() => {
      if (!onLayout) return;
      const textarea = textareaRef.current;
      if (!textarea || typeof ResizeObserver === 'undefined') return;

      const emit = () =>
        onLayout({
          nativeEvent: {
            layout: {
              height: textarea.offsetHeight,
              width: textarea.offsetWidth,
              x: textarea.offsetLeft,
              y: textarea.offsetTop,
            },
          },
        });

      emit();
      const observer = new ResizeObserver(emit);
      observer.observe(textarea);
      return () => observer.disconnect();
    }, [onLayout]);

    React.useEffect(
      () => () => {
        if (pastePlainResetTimeoutRef.current) {
          clearTimeout(pastePlainResetTimeoutRef.current);
        }
      },
      []
    );

    React.useEffect(() => {
      if (value !== undefined) setLocalValue(value);
    }, [value]);

    const handleRef = React.useCallback(
      (node: React.ComponentRef<typeof TextareaAutosize> | null) => {
        textareaRef.current = node;

        if (typeof ref === 'function') {
          ref(node);
          return;
        }

        if (ref) ref.current = node;
      },
      [ref]
    );

    const notifySelectionChange = React.useCallback(
      (textarea: HTMLTextAreaElement) => {
        onSelectionChange?.({
          nativeEvent: {
            selection: {
              end: textarea.selectionEnd,
              start: textarea.selectionStart,
            },
          },
        });
      },
      [onSelectionChange]
    );

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly || props.disabled) return;
        const textarea = e.target;
        const scrollToBottom = shouldKeepTextareaScrolledToBottom(textarea);
        const text = e.target.value;
        setLocalValue(text);
        if (onChangeText) React.startTransition(() => onChangeText(text));
        notifySelectionChange(textarea);
        keepTextareaScrolledToBottom(textarea, scrollToBottom);
      },
      [notifySelectionChange, onChangeText, props.disabled, readOnly]
    );

    const handleTouchStart = React.useCallback(
      (event: React.TouchEvent<HTMLTextAreaElement>) => {
        onTouchStart?.(event);
        if (readOnly || props.disabled) return;
        if (typeof document === 'undefined') return;
        const activeElement = document.activeElement as HTMLElement | null;
        const activeTagName = activeElement?.tagName;

        const isTextEntryActive =
          activeTagName === 'TEXTAREA' ||
          activeTagName === 'INPUT' ||
          !!activeElement?.isContentEditable;

        if (!isTextEntryActive) return;

        const textarea = textareaRef.current as unknown as {
          focus?: (options?: { preventScroll?: boolean }) => void;
        } | null;

        if (!textarea?.focus || document.activeElement === textarea) return;

        // Mobile web can briefly collapse the keyboard when moving focus
        // between text fields. Only assist an existing text-entry handoff;
        // fresh taps should use the browser's normal focus timing.
        try {
          textarea.focus({ preventScroll: true });
        } catch {
          textarea.focus();
        }
      },
      [onTouchStart, props.disabled, readOnly]
    );

    const handleSelect = React.useCallback(
      (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
        onSelect?.(event);
        notifySelectionChange(event.currentTarget);
      },
      [notifySelectionChange, onSelect]
    );

    const applyTextEdit = React.useCallback(
      (
        textarea: HTMLTextAreaElement,
        text: string,
        selectionStart: number,
        selectionEnd: number,
        scrollToBottom: boolean
      ) => {
        if (readOnly || props.disabled) return;

        applyTextareaEditWithUndo(textarea, {
          selectionEnd,
          selectionStart,
          text,
        });

        setLocalValue(text);
        if (onChangeText) React.startTransition(() => onChangeText(text));

        requestAnimationFrame(() => {
          textarea.setSelectionRange(selectionStart, selectionEnd);
          notifySelectionChange(textarea);
          keepTextareaScrolledToBottom(textarea, scrollToBottom);
        });
      },
      [notifySelectionChange, onChangeText, props.disabled, readOnly]
    );

    const armPlainTextPaste = React.useCallback(() => {
      pastePlainOnNextPasteRef.current = true;

      if (pastePlainResetTimeoutRef.current) {
        clearTimeout(pastePlainResetTimeoutRef.current);
      }

      pastePlainResetTimeoutRef.current = setTimeout(() => {
        pastePlainOnNextPasteRef.current = false;
        pastePlainResetTimeoutRef.current = undefined;
      }, 1000);
    }, []);

    const handlePaste = React.useCallback(
      (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        onPaste?.(event);
        if (event.defaultPrevented) return;
        if (!pasteRichTextAsMarkdown) return;
        if (readOnly || props.disabled) return;

        const shouldPastePlain =
          pastePlainOnNextPasteRef.current || isShiftPasteEvent(event);

        pastePlainOnNextPasteRef.current = false;
        if (shouldPastePlain) return;
        const html = event.clipboardData.getData('text/html');
        if (!html) return;
        const textarea = event.currentTarget;
        const scrollToBottom = shouldKeepTextareaScrolledToBottom(textarea);

        const edit = getRichTextPasteEdit({
          html,
          maxLength,
          selectionEnd: textarea.selectionEnd,
          selectionStart: textarea.selectionStart,
          text: textarea.value,
        });

        if (!edit) return;
        event.preventDefault();

        applyTextEdit(
          textarea,
          edit.text,
          edit.selectionStart,
          edit.selectionEnd,
          scrollToBottom
        );
      },
      [
        applyTextEdit,
        maxLength,
        onPaste,
        pasteRichTextAsMarkdown,
        props.disabled,
        readOnly,
      ]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (readOnly || props.disabled) return;

        if (isPlainTextPasteShortcut(e)) {
          armPlainTextPaste();
          return;
        }

        if (!e.shiftKey && e.key === 'Enter' && onSubmitEditing) {
          e.preventDefault();
          onSubmitEditing();
          return;
        }

        if (
          e.key !== 'Enter' ||
          e.altKey ||
          e.ctrlKey ||
          e.metaKey ||
          (e.nativeEvent as KeyboardEvent).isComposing
        ) {
          return;
        }

        const textarea = e.currentTarget;
        const scrollToBottom = shouldKeepTextareaScrolledToBottom(textarea);

        if (e.shiftKey) {
          keepTextareaScrolledToBottom(textarea, scrollToBottom);
          return;
        }

        const edit = getMarkdownListEnterEdit({
          selectionEnd: textarea.selectionEnd,
          selectionStart: textarea.selectionStart,
          text: textarea.value,
        });

        if (!edit) {
          keepTextareaScrolledToBottom(textarea, scrollToBottom);
          return;
        }

        if (typeof maxLength === 'number' && edit.text.length > maxLength) {
          keepTextareaScrolledToBottom(textarea, scrollToBottom);
          return;
        }

        e.preventDefault();

        applyTextEdit(
          textarea,
          edit.text,
          edit.selectionStart,
          edit.selectionEnd,
          scrollToBottom
        );
      },
      [
        applyTextEdit,
        armPlainTextPaste,
        maxLength,
        onKeyDown,
        onSubmitEditing,
        props.disabled,
        readOnly,
      ]
    );

    return (
      <TextareaAutosize
        ref={handleRef}
        autoFocus={autoFocus}
        maxLength={maxLength}
        maxRows={maxRows ?? numberOfLines}
        minRows={minRows}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onSelect={handleSelect}
        onTouchStart={handleTouchStart}
        placeholder={placeholder}
        readOnly={readOnly}
        value={localValue}
        className={cn(
          'native:placeholder:text-placeholder border-border-secondary bg-input text-foreground web:placeholder:text-placeholder w-full resize-none overflow-y-auto rounded-xl border focus-visible:outline-hidden border-continuous',
          size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5',
          readOnly && 'opacity-50 web:cursor-not-allowed',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

function shouldKeepTextareaScrolledToBottom(textarea: HTMLTextAreaElement) {
  return (
    textarea.selectionEnd >= textarea.value.length ||
    textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight <=
      getTextareaScrollTolerance(textarea)
  );
}

function keepTextareaScrolledToBottom(
  textarea: HTMLTextAreaElement,
  shouldScroll: boolean
) {
  if (shouldScroll) scrollTextareaToBottomOnNextFrames(textarea);
}

function scrollTextareaToBottomOnNextFrames(textarea: HTMLTextAreaElement) {
  requestAnimationFrame(() => {
    scrollTextareaToBottom(textarea);
    requestAnimationFrame(() => scrollTextareaToBottom(textarea));
  });
}

function scrollTextareaToBottom(textarea: HTMLTextAreaElement) {
  textarea.scrollTop = textarea.scrollHeight;
}

function isPlainTextPasteShortcut(
  event: React.KeyboardEvent<HTMLTextAreaElement>
) {
  if (!event.shiftKey) return false;
  const key = event.key.toLowerCase();
  return (key === 'v' && (event.metaKey || event.ctrlKey)) || key === 'insert';
}

function isShiftPasteEvent(event: React.ClipboardEvent<HTMLTextAreaElement>) {
  return !!(event.nativeEvent as ClipboardEvent & { shiftKey?: boolean })
    .shiftKey;
}

function getTextareaScrollTolerance(textarea: HTMLTextAreaElement) {
  const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);
  return Number.isFinite(lineHeight) ? lineHeight / 2 : 12;
}
