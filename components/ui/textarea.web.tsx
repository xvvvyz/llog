import { cn } from '@/utilities/ui/utils';
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from 'react';
import { TextInput } from 'react-native';
import TextareaAutosize from 'react-textarea-autosize';

export const Textarea = forwardRef<
  ComponentRef<typeof TextareaAutosize>,
  ComponentPropsWithoutRef<typeof TextInput> & {
    onSubmitEditing?: () => void;
  }
>(
  (
    {
      autoFocus,
      className,
      maxLength,
      onChangeText,
      onSubmitEditing,
      placeholder,
      value,
    },
    ref
  ) => (
    <TextareaAutosize
      autoFocus={autoFocus}
      className={cn(
        'native:placeholder:text-placeholder w-full resize-none rounded-xl border border-border-secondary bg-input px-4 py-2.5 text-foreground focus-visible:outline-none web:placeholder:text-placeholder',
        className
      )}
      maxLength={maxLength}
      maxRows={12}
      onChange={(e) => onChangeText?.(e.target.value)}
      onKeyDown={(e) => {
        if (!e.shiftKey && e.key === 'Enter' && onSubmitEditing) {
          e.preventDefault();
          onSubmitEditing();
        }
      }}
      placeholder={placeholder}
      ref={ref}
      value={value}
    />
  )
);

Textarea.displayName = 'Textarea';
