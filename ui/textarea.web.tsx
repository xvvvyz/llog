import { cn } from '@/lib/cn';
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

    return (
      <TextareaAutosize
        ref={handleRef}
        autoFocus={autoFocus}
        maxLength={maxLength}
        maxRows={maxRows ?? numberOfLines}
        minRows={minRows}
        onChange={handleChange}
        onTouchStart={handleTouchStart}
        placeholder={placeholder}
        readOnly={readOnly}
        value={localValue}
        className={cn(
          'native:placeholder:text-placeholder border-border-secondary bg-input text-foreground web:placeholder:text-placeholder w-full resize-none overflow-y-auto rounded-xl border focus-visible:outline-hidden border-continuous',
          size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5',
          className
        )}
        onKeyDown={(e) => {
          if (!e.shiftKey && e.key === 'Enter' && onSubmitEditing) {
            e.preventDefault();
            onSubmitEditing();
          }
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
