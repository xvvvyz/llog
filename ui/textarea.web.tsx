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
      placeholder,
      value,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(
      value ?? defaultValue ?? ''
    );

    React.useEffect(() => {
      if (value !== undefined) setLocalValue(value);
    }, [value]);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setLocalValue(text);
        if (onChangeText) React.startTransition(() => onChangeText(text));
      },
      [onChangeText]
    );

    return (
      <TextareaAutosize
        ref={ref}
        autoFocus={autoFocus}
        maxLength={maxLength}
        maxRows={maxRows ?? numberOfLines}
        minRows={minRows}
        onChange={handleChange}
        placeholder={placeholder}
        value={localValue}
        className={cn(
          'native:placeholder:text-placeholder border-border-secondary bg-input text-foreground web:placeholder:text-placeholder w-full resize-none overflow-y-auto rounded-xl border px-4 py-2.5 focus-visible:outline-hidden',
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
