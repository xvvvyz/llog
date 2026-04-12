import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { TextInput } from 'react-native';

const inputVariants = cva(
  'text-base native:leading-5 border border-border-secondary placeholder:text-placeholder rounded-xl bg-input text-foreground web:focus-visible:outline-none',
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

const Input = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  React.ComponentPropsWithoutRef<typeof TextInput> &
    VariantProps<typeof inputVariants>
>(({ className, size, value, onChangeText, defaultValue, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(
    value ?? defaultValue ?? ''
  );

  React.useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);

  const handleChangeText = React.useCallback(
    (text: string) => {
      setLocalValue(text);
      if (onChangeText) React.startTransition(() => onChangeText(text));
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
      style={{ borderCurve: 'continuous' }}
      submitBehavior="submit"
      value={localValue}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input, inputVariants };
