import { cn } from '@/utilities/cn';
import TextareaAutosize from 'react-textarea-autosize';

import * as React from 'react';

export const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextareaAutosize>,
  Omit<React.ComponentPropsWithoutRef<typeof TextareaAutosize>, 'onChange'> & {
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
        autoFocus={autoFocus}
        className={cn(
          'native:placeholder:text-placeholder w-full resize-none rounded-xl border border-border-secondary bg-input px-4 py-2.5 text-foreground focus-visible:outline-none web:placeholder:text-placeholder',
          className
        )}
        maxLength={maxLength}
        maxRows={numberOfLines}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (!e.shiftKey && e.key === 'Enter' && onSubmitEditing) {
            e.preventDefault();
            onSubmitEditing();
          }
        }}
        placeholder={placeholder}
        ref={ref}
        value={localValue}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
