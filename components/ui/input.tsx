import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { TextInput } from 'react-native';

import {
  ComponentPropsWithoutRef,
  ComponentRef,
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from 'react';

const inputVariants = cva(
  'text-base leading-5 border border-border-secondary ios:overflow-hidden native:placeholder:text-placeholder rounded-xl bg-input text-foreground file:border-0 file:bg-transparent file:font-medium web:w-full web:placeholder:text-placeholder web:focus-visible:outline-none',
  {
    defaultVariants: {
      size: 'default',
    },
    variants: {
      size: {
        default: 'h-11 px-4',
        lg: 'h-12 px-5',
        sm: 'h-10 px-3',
      },
    },
  }
);

const Input = forwardRef<
  ComponentRef<typeof TextInput>,
  ComponentPropsWithoutRef<typeof TextInput> &
    VariantProps<typeof inputVariants>
>(({ className, size, value, onChangeText, defaultValue, ...props }, ref) => {
  const [localValue, setLocalValue] = useState(value ?? defaultValue ?? '');

  useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);
      if (onChangeText) startTransition(() => onChangeText(text));
    },
    [onChangeText]
  );

  return (
    <TextInput
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect={false}
      blurOnSubmit={false}
      className={cn(
        inputVariants({ size }),
        props.editable === false && 'opacity-50 web:cursor-not-allowed',
        className
      )}
      lineBreakModeIOS="clip"
      onChangeText={handleChangeText}
      ref={ref}
      returnKeyType="done"
      style={{ borderCurve: 'continuous' as const }}
      submitBehavior="submit"
      value={localValue}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input, inputVariants };
