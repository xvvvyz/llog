import { cn } from '@/utilities/ui/utils';
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from 'react';
import { TextInput } from 'react-native';
import TextareaAutosize from 'react-textarea-autosize';

export const Textarea = forwardRef<
  ComponentRef<typeof TextareaAutosize>,
  ComponentPropsWithoutRef<typeof TextInput>
>(
  (
    { autoFocus, className, maxLength, onChangeText, placeholder, value },
    ref
  ) => (
    <TextareaAutosize
      autoFocus={autoFocus}
      className={cn(
        'w-full resize-none rounded-xl border border-border-secondary bg-input px-4 py-2.5 text-foreground placeholder:text-placeholder focus-visible:outline-none',
        className
      )}
      maxLength={maxLength}
      onChange={(event) => onChangeText?.(event.target.value)}
      placeholder={placeholder}
      ref={ref}
      value={value}
    />
  )
);

Textarea.displayName = 'Textarea';
