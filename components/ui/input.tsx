import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Keyboard, Platform, StyleSheet, TextInput } from 'react-native';

const inputVariants = cva(
  'text-base native:text-base native:leading-5 border border-border-secondary web:placeholder:text-placeholder rounded-xl bg-input text-foreground web:focus-visible:outline-hidden',
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
>(
  (
    {
      blurOnSubmit,
      className,
      defaultValue,
      onChangeText,
      onSubmitEditing,
      returnKeyType = 'done',
      size,
      style,
      submitBehavior,
      value,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(
      value ?? defaultValue ?? ''
    );
    const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);

    const resolvedSubmitBehavior =
      submitBehavior ?? (returnKeyType === 'next' ? 'submit' : 'blurAndSubmit');

    const resolvedBlurOnSubmit =
      blurOnSubmit ?? resolvedSubmitBehavior === 'blurAndSubmit';

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

    const handleRef = React.useCallback(
      (node: React.ComponentRef<typeof TextInput> | null) => {
        inputRef.current = node;

        if (typeof ref === 'function') {
          ref(node);
          return;
        }

        if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const handleSubmitEditing = React.useCallback(
      (event: Parameters<NonNullable<typeof onSubmitEditing>>[0]) => {
        onSubmitEditing?.(event);

        if (Platform.OS === 'web') return;
        if (resolvedSubmitBehavior !== 'blurAndSubmit') return;

        inputRef.current?.blur();
        Keyboard.dismiss();
      },
      [onSubmitEditing, resolvedSubmitBehavior]
    );

    return (
      <TextInput
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        blurOnSubmit={resolvedBlurOnSubmit}
        className={cn(
          inputVariants({ size }),
          props.editable === false && 'web:cursor-not-allowed opacity-50',
          className
        )}
        lineBreakModeIOS="clip"
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmitEditing}
        placeholderTextColorClassName="accent-placeholder"
        ref={handleRef}
        returnKeyType={returnKeyType}
        style={StyleSheet.flatten([{ borderCurve: 'continuous' }, style])}
        submitBehavior={resolvedSubmitBehavior}
        value={localValue}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
