import { cn } from '@/utilities/cn';
import * as React from 'react';
import { StyleSheet, TextInput } from 'react-native';

const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, style, value, onChangeText, defaultValue, ...props }, ref) => {
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
      autoCapitalize="sentences"
      autoComplete="off"
      autoCorrect
      blurOnSubmit={false}
      className={cn(
        'border-border-secondary bg-input native:text-base text-foreground rounded-xl border px-4 py-2.5 text-base',
        className
      )}
      lineBreakModeIOS="wordWrapping"
      multiline
      onChangeText={handleChangeText}
      placeholderTextColorClassName="accent-placeholder"
      ref={ref}
      returnKeyType="default"
      scrollEnabled
      style={StyleSheet.flatten([{ borderCurve: 'continuous' }, style])}
      submitBehavior="newline"
      textAlignVertical="top"
      value={localValue}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
