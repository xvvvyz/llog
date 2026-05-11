import { cn } from '@/lib/cn';
import { getMarkdownListEnterEdit } from '@/ui/textarea-markdown-lists';
import * as React from 'react';
import TextareaAutosize from 'react-textarea-autosize';

export const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextareaAutosize>,
  Omit<React.ComponentPropsWithoutRef<typeof TextareaAutosize>, 'onChange'> & {
    maxRows?: number;
    minRows?: number;
    numberOfLines?: number;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: () => void;
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
      onKeyDown,
      onSubmitEditing,
      onTouchStart,
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

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setLocalValue(text);
        if (onChangeText) React.startTransition(() => onChangeText(text));
      },
      [onChangeText]
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

    const applyTextEdit = React.useCallback(
      (
        textarea: HTMLTextAreaElement,
        text: string,
        selectionStart: number,
        selectionEnd: number,
        scrollToBottom: boolean
      ) => {
        setLocalValue(text);
        if (onChangeText) React.startTransition(() => onChangeText(text));

        requestAnimationFrame(() => {
          textarea.setSelectionRange(selectionStart, selectionEnd);
          keepTextareaScrolledToBottom(textarea, scrollToBottom);
        });
      },
      [onChangeText]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;

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
      [applyTextEdit, maxLength, onKeyDown, onSubmitEditing]
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
        onTouchStart={handleTouchStart}
        placeholder={placeholder}
        readOnly={readOnly}
        value={localValue}
        className={cn(
          'native:placeholder:text-placeholder border-border-secondary bg-input text-foreground web:placeholder:text-placeholder w-full resize-none overflow-y-auto rounded-xl border focus-visible:outline-hidden border-continuous',
          size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5',
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

function getTextareaScrollTolerance(textarea: HTMLTextAreaElement) {
  const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);
  return Number.isFinite(lineHeight) ? lineHeight / 2 : 12;
}
