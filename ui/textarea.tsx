import { cn } from '@/lib/cn';
import * as React from 'react';
import { StyleSheet, TextInput } from 'react-native';

type TextareaProps = React.ComponentPropsWithoutRef<typeof TextInput> & {
  maxRows?: number;
  minRows?: number;
};

const NATIVE_TEXTAREA_LINE_HEIGHT = 20;
const NATIVE_TEXTAREA_VERTICAL_PADDING = 20;

const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextareaProps
>(
  (
    {
      className,
      defaultValue,
      maxRows,
      minRows,
      numberOfLines,
      onChangeText,
      onContentSizeChange,
      scrollEnabled,
      style,
      value,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(
      value ?? defaultValue ?? ''
    );

    const [contentHeight, setContentHeight] = React.useState<number>();

    const minHeight = minRows
      ? minRows * NATIVE_TEXTAREA_LINE_HEIGHT + NATIVE_TEXTAREA_VERTICAL_PADDING
      : undefined;

    const maxHeight = maxRows
      ? maxRows * NATIVE_TEXTAREA_LINE_HEIGHT + NATIVE_TEXTAREA_VERTICAL_PADDING
      : undefined;

    const autoHeight =
      contentHeight && (minRows || maxRows)
        ? Math.min(
            maxHeight ?? contentHeight,
            Math.max(minHeight ?? 0, contentHeight)
          )
        : undefined;

    const autoSizeStyle =
      minRows || maxRows
        ? {
            height: autoHeight ?? minHeight,
            maxHeight,
            minHeight,
          }
        : undefined;

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

    const handleContentSizeChange = React.useCallback<
      NonNullable<TextareaProps['onContentSizeChange']>
    >(
      (event) => {
        if (minRows || maxRows) {
          setContentHeight(event.nativeEvent.contentSize.height);
        }

        onContentSizeChange?.(event);
      },
      [maxRows, minRows, onContentSizeChange]
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
        numberOfLines={minRows ?? numberOfLines}
        onContentSizeChange={handleContentSizeChange}
        onChangeText={handleChangeText}
        placeholderTextColorClassName="accent-placeholder"
        ref={ref}
        returnKeyType="default"
        scrollEnabled={scrollEnabled ?? true}
        style={StyleSheet.flatten([
          { borderCurve: 'continuous' },
          autoSizeStyle,
          style,
        ])}
        submitBehavior="newline"
        textAlignVertical="top"
        value={localValue}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
