import { cn } from '@/lib/cn';
import * as React from 'react';
import { StyleSheet, TextInput } from 'react-native';

type TextareaProps = React.ComponentPropsWithoutRef<typeof TextInput> & {
  maxRows?: number;
  minRows?: number;
  onKeyDown?: unknown;
  pasteRichTextAsMarkdown?: boolean;
  readOnly?: boolean;
  size?: 'default' | 'sm';
};

const NATIVE_TEXTAREA_LINE_HEIGHT = 20;
const NATIVE_TEXTAREA_VERTICAL_PADDING = 20;
type TextSelection = { end: number; start: number };

const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextareaProps
>(
  (
    {
      className,
      defaultValue,
      editable,
      maxRows,
      minRows,
      numberOfLines,
      onChangeText,
      onContentSizeChange,
      onSelectionChange,
      onKeyDown: _onKeyDown,
      pasteRichTextAsMarkdown: _pasteRichTextAsMarkdown,
      readOnly,
      scrollEnabled,
      size = 'default',
      style,
      value,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(
      value ?? defaultValue ?? ''
    );

    void _onKeyDown;
    void _pasteRichTextAsMarkdown;
    const [contentHeight, setContentHeight] = React.useState<number>();
    const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
    const localValueRef = React.useRef(localValue);

    const selectionRef = React.useRef<TextSelection>({
      end: localValue.length,
      start: localValue.length,
    });

    const keepScrolledToBottomRef = React.useRef(false);

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
        ? { height: autoHeight ?? minHeight, maxHeight, minHeight }
        : undefined;

    React.useEffect(() => {
      if (value === undefined) return;
      localValueRef.current = value;
      setLocalValue(value);
    }, [value]);

    const handleRef = React.useCallback(
      (node: React.ComponentRef<typeof TextInput> | null) => {
        inputRef.current = node;

        if (typeof ref === 'function') {
          ref(node);
          return;
        }

        if (ref) ref.current = node;
      },
      [ref]
    );

    const keepScrolledToBottom = React.useCallback(() => {
      requestAnimationFrame(() => {
        const input = inputRef.current;
        const end = localValueRef.current.length;
        input?.setSelection(end, end);
        requestAnimationFrame(() => input?.setSelection(end, end));
      });
    }, []);

    const handleChangeText = React.useCallback(
      (text: string) => {
        if (readOnly) return;
        const selection = selectionRef.current;
        const previousLength = localValueRef.current.length;

        const shouldKeepScrolledToBottom =
          selection.start === selection.end &&
          selection.end >= previousLength &&
          text.length >= previousLength;

        keepScrolledToBottomRef.current = shouldKeepScrolledToBottom;
        localValueRef.current = text;
        setLocalValue(text);
        if (onChangeText) React.startTransition(() => onChangeText(text));
        if (shouldKeepScrolledToBottom) keepScrolledToBottom();
      },
      [keepScrolledToBottom, onChangeText, readOnly]
    );

    const handleSelectionChange = React.useCallback<
      NonNullable<TextareaProps['onSelectionChange']>
    >(
      (event) => {
        selectionRef.current = event.nativeEvent.selection;
        onSelectionChange?.(event);
      },
      [onSelectionChange]
    );

    const handleContentSizeChange = React.useCallback<
      NonNullable<TextareaProps['onContentSizeChange']>
    >(
      (event) => {
        if (minRows || maxRows) {
          setContentHeight(event.nativeEvent.contentSize.height);
        }

        onContentSizeChange?.(event);
        if (keepScrolledToBottomRef.current) keepScrolledToBottom();
      },
      [keepScrolledToBottom, maxRows, minRows, onContentSizeChange]
    );

    return (
      <TextInput
        ref={handleRef}
        autoCapitalize="sentences"
        autoComplete="off"
        autoCorrect
        blurOnSubmit={false}
        editable={readOnly ? false : editable}
        lineBreakModeIOS="wordWrapping"
        multiline
        numberOfLines={minRows ?? numberOfLines}
        onChangeText={handleChangeText}
        onContentSizeChange={handleContentSizeChange}
        onSelectionChange={handleSelectionChange}
        placeholderTextColorClassName="accent-placeholder"
        returnKeyType="default"
        scrollEnabled={scrollEnabled ?? true}
        style={StyleSheet.flatten([autoSizeStyle, style])}
        submitBehavior="newline"
        textAlignVertical="top"
        value={localValue}
        className={cn(
          'border-border-secondary bg-input native:text-base text-foreground rounded-xl border text-base border-continuous',
          size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5',
          readOnly && 'opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
