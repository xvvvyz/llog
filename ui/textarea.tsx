import { cn } from '@/lib/cn';
import * as React from 'react';
import { Platform, StyleSheet, TextInput } from 'react-native';
import * as sheetDragContext from '@/ui/sheet-drag-context';
import * as textareaMetrics from '@/ui/textarea-metrics';

type TextareaProps = React.ComponentPropsWithoutRef<typeof TextInput> & {
  /**
   * Stretch the textarea to fill its flex parent. Web and native disagree on
   * how a TextInput grows (`height: 100%` vs `flex: 1`), so the platform-correct
   * recipe lives here instead of being re-pasted at every full-height caller.
   */
  fill?: boolean;
  maxRows?: number;
  minRows?: number;
  onKeyDown?: unknown;
  pasteRichTextAsMarkdown?: boolean;
  readOnly?: boolean;
  size?: textareaMetrics.TextareaSize;
};

type TextareaScrollEvent = Parameters<
  NonNullable<TextareaProps['onScroll']>
>[0];

type TextSelection = { end: number; start: number };
// lineHeight matches TEXTAREA_LINE_HEIGHT so the rendered text and the row
// math agree; keeping them in sync is what avoids iOS multiline scroll
// clipping the last line.
//
// Unlike <Text> and Android's CustomLineHeightSpan, a multiline TextInput on
// iOS gets no centering baseline offset, so all of lineHeight's extra leading
// lands above the first line and the text sits too low. Shift it up by half the
// leading by moving that much from the top padding to the bottom; total vertical
// padding is unchanged, so the row math in textarea-metrics still holds.
const IOS_FONT_LINE_HEIGHT = 19; // iOS system font line height at fontSize 16

const IOS_LEADING_OFFSET =
  Platform.OS === 'ios'
    ? (textareaMetrics.TEXTAREA_LINE_HEIGHT - IOS_FONT_LINE_HEIGHT) / 2
    : 0;

const buildNativeTextStyle = (size: textareaMetrics.TextareaSize) => ({
  fontSize: textareaMetrics.TEXTAREA_FONT_SIZE,
  lineHeight: textareaMetrics.TEXTAREA_LINE_HEIGHT,
  paddingBottom:
    textareaMetrics.TEXTAREA_SIZE_PADDING[size].paddingBottom +
    IOS_LEADING_OFFSET,
  paddingHorizontal:
    textareaMetrics.TEXTAREA_SIZE_PADDING[size].paddingHorizontal,
  paddingTop:
    textareaMetrics.TEXTAREA_SIZE_PADDING[size].paddingTop - IOS_LEADING_OFFSET,
});

const nativeTextStyles = StyleSheet.create({
  default: buildNativeTextStyle('default'),
  sm: buildNativeTextStyle('sm'),
});

// A TextInput fills its flex parent differently per platform: web honors
// `height: 100%`, native needs `flex: 1`.
const fillStyle = StyleSheet.create({
  fill: Platform.OS === 'web' ? { height: '100%' } : { flex: 1 },
}).fill;

const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextareaProps
>(
  (
    {
      autoFocus,
      className,
      defaultValue,
      editable,
      fill,
      maxRows,
      minRows,
      numberOfLines,
      onBlur,
      onChangeText,
      onContentSizeChange,
      onFocus,
      onLayout,
      onScroll,
      onSelectionChange,
      onKeyDown: _onKeyDown,
      pasteRichTextAsMarkdown: _pasteRichTextAsMarkdown,
      readOnly,
      scrollEnabled,
      size = 'default',
      style,
      onTouchCancel,
      onTouchEnd,
      onTouchStart,
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
    const [layoutWidth, setLayoutWidth] = React.useState<number>();
    const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
    const sheetDragLock = sheetDragContext.useSheetDragLock();
    const localValueRef = React.useRef(localValue);

    const selectionRef = React.useRef<TextSelection>({
      end: localValue.length,
      start: localValue.length,
    });

    const keepScrolledToBottomRef = React.useRef(false);

    const { horizontalPadding, verticalPadding } =
      textareaMetrics.TEXTAREA_SIZE_PADDING[size];

    const minHeight = minRows
      ? minRows * textareaMetrics.TEXTAREA_LINE_HEIGHT + verticalPadding
      : undefined;

    const maxHeight = maxRows
      ? maxRows * textareaMetrics.TEXTAREA_LINE_HEIGHT + verticalPadding
      : undefined;

    const shouldAutoSize = !!(minRows || maxRows);

    const estimatedContentHeight = React.useMemo(
      () =>
        shouldAutoSize
          ? textareaMetrics.getEstimatedTextareaContentHeight({
              horizontalPadding,
              text: localValue,
              verticalPadding,
              width: layoutWidth,
            })
          : undefined,
      [
        shouldAutoSize,
        horizontalPadding,
        localValue,
        verticalPadding,
        layoutWidth,
      ]
    );

    const measuredContentHeight =
      localValue.length === 0
        ? estimatedContentHeight
        : contentHeight && estimatedContentHeight
          ? Math.max(contentHeight, estimatedContentHeight)
          : (contentHeight ?? estimatedContentHeight);

    const autoHeight =
      measuredContentHeight && shouldAutoSize
        ? Math.min(
            maxHeight ?? measuredContentHeight,
            Math.max(minHeight ?? 0, measuredContentHeight)
          )
        : undefined;

    const autoSizeStyle = shouldAutoSize
      ? { height: autoHeight ?? minHeight, maxHeight, minHeight }
      : undefined;

    const resolvedScrollEnabled =
      scrollEnabled ??
      (shouldAutoSize
        ? !!(
            measuredContentHeight &&
            maxHeight &&
            measuredContentHeight > maxHeight
          )
        : true);

    // iOS makes a multiline TextInput first responder the instant a touch
    // reaches it — including a touch that's about to become a scroll — so
    // scrolling a long note pops the keyboard. We can't stop the focus, but we
    // can stop the keyboard: keep soft input *suppressed* on focus, then raise
    // it only once a caret is actually placed, which only a tap does (a scroll
    // places none). The field stays natively editable throughout, so the tap
    // still drops the caret exactly where you tapped. Only readOnly/non-editable
    // fields opt out. autoFocus fields participate too, but start with soft
    // input enabled so their initial focus still shows the keyboard — scrolling
    // only stops re-opening it after the keyboard has been dismissed once.
    const suppressKeyboardUntilTap =
      Platform.OS === 'ios' && !readOnly && editable !== false;

    const [softInputEnabled, setSoftInputEnabled] = React.useState(!!autoFocus);
    const softInputEnabledRef = React.useRef(!!autoFocus);
    const focusedRef = React.useRef(false);
    const raisingRef = React.useRef(false);

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

    const setSoftInput = React.useCallback((enabled: boolean) => {
      softInputEnabledRef.current = enabled;
      setSoftInputEnabled(enabled);
    }, []);

    // Bring the keyboard up for the already-focused field. Soft input was
    // suppressed on focus, so a fresh focus transition (blur → focus) is what
    // shows the keyboard; we restore the tapped caret across it. The raising
    // flag keeps the internal blur/focus from churning the caller's
    // onBlur/onFocus.
    const raiseKeyboard = React.useCallback(() => {
      if (softInputEnabledRef.current || raisingRef.current) return;
      const selection = selectionRef.current;
      raisingRef.current = true;
      setSoftInput(true);

      requestAnimationFrame(() => {
        const input = inputRef.current;
        input?.blur();
        input?.focus();
        input?.setSelection(selection.start, selection.end);
      });
    }, [setSoftInput]);

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

        // A caret placement while soft input is still suppressed is the tell
        // that this focus was a tap, not a scroll — raise the keyboard.
        if (
          suppressKeyboardUntilTap &&
          focusedRef.current &&
          !raisingRef.current &&
          !softInputEnabledRef.current
        ) {
          raiseKeyboard();
        }

        onSelectionChange?.(event);
      },
      [onSelectionChange, raiseKeyboard, suppressKeyboardUntilTap]
    );

    const handleLayout = React.useCallback<
      NonNullable<TextareaProps['onLayout']>
    >(
      (event) => {
        setLayoutWidth(Math.ceil(event.nativeEvent.layout.width));
        onLayout?.(event);
      },
      [onLayout]
    );

    // The measured width only seeds the height estimate before the first
    // onContentSizeChange — which web reports authoritatively, so the estimate
    // is a native-only floor (it prevents iOS clipping the last line). Web also
    // can't take onLayout: uniwind forwards it onto the DOM <textarea>, where
    // React rejects it as an unknown event handler. Omit the prop entirely on
    // web rather than passing undefined, which still trips the warning.
    const layoutProps =
      Platform.OS === 'web' ? undefined : { onLayout: handleLayout };

    const handleExternalScroll = React.useCallback<
      NonNullable<TextareaProps['onScroll']>
    >(
      (event) => {
        if (!onScroll) return;

        const nativeEvent =
          event.nativeEvent as TextareaScrollEvent['nativeEvent'] & {
            contentSize?: { height?: number; width?: number };
            layoutMeasurement?: { height?: number; width?: number };
          };

        const contentSize = nativeEvent.contentSize;
        const layoutMeasurement = nativeEvent.layoutMeasurement;
        const nativeContentHeight = contentSize?.height;
        const nativeViewportHeight = layoutMeasurement?.height;

        const contentHeight =
          nativeContentHeight && measuredContentHeight
            ? Math.max(nativeContentHeight, measuredContentHeight)
            : nativeContentHeight || measuredContentHeight;

        const viewportHeight = nativeViewportHeight || autoHeight;

        if (
          contentHeight === nativeContentHeight &&
          viewportHeight === nativeViewportHeight
        ) {
          onScroll(event);
          return;
        }

        onScroll({
          ...event,
          nativeEvent: {
            ...nativeEvent,
            contentSize: { ...contentSize, height: contentHeight },
            layoutMeasurement: { ...layoutMeasurement, height: viewportHeight },
          },
        } as TextareaScrollEvent);
      },
      [autoHeight, measuredContentHeight, onScroll]
    );

    const handleScroll = sheetDragContext.useSheetScrollHandler(
      handleExternalScroll,
      { scrollable: resolvedScrollEnabled }
    );

    const handleBlur = React.useCallback<NonNullable<TextareaProps['onBlur']>>(
      (event) => {
        // Ignore the internal blur from raiseKeyboard's focus transition.
        if (raisingRef.current) return;
        focusedRef.current = false;
        sheetDragLock.unlock();
        if (suppressKeyboardUntilTap) setSoftInput(false);
        onBlur?.(event);
      },
      [onBlur, setSoftInput, sheetDragLock, suppressKeyboardUntilTap]
    );

    const handleFocus = React.useCallback<
      NonNullable<TextareaProps['onFocus']>
    >(
      (event) => {
        // The internal refocus from raiseKeyboard lands here; clear the flag so
        // later real blur/focus events flow through, but don't re-notify.
        if (raisingRef.current) {
          raisingRef.current = false;
          return;
        }

        focusedRef.current = true;
        onFocus?.(event);
      },
      [onFocus]
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

    const handleTouchStart = React.useCallback<
      NonNullable<TextareaProps['onTouchStart']>
    >(
      (event) => {
        if (resolvedScrollEnabled) sheetDragLock.lock();
        onTouchStart?.(event);
      },
      [onTouchStart, resolvedScrollEnabled, sheetDragLock]
    );

    const handleTouchEnd = React.useCallback<
      NonNullable<TextareaProps['onTouchEnd']>
    >(
      (event) => {
        sheetDragLock.unlock();
        onTouchEnd?.(event);
      },
      [onTouchEnd, sheetDragLock]
    );

    const handleTouchCancel = React.useCallback<
      NonNullable<TextareaProps['onTouchCancel']>
    >(
      (event) => {
        sheetDragLock.unlock();
        onTouchCancel?.(event);
      },
      [onTouchCancel, sheetDragLock]
    );

    return (
      <TextInput
        ref={handleRef}
        autoCapitalize="sentences"
        autoComplete="off"
        autoCorrect
        autoFocus={autoFocus}
        blurOnSubmit={false}
        caretHidden={suppressKeyboardUntilTap && !softInputEnabled}
        editable={readOnly ? false : editable}
        lineBreakModeIOS="wordWrapping"
        multiline
        numberOfLines={minRows ?? numberOfLines}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        onContentSizeChange={handleContentSizeChange}
        onFocus={handleFocus}
        onScroll={handleScroll}
        onSelectionChange={handleSelectionChange}
        onTouchCancel={handleTouchCancel}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
        placeholderTextColorClassName="accent-placeholder"
        returnKeyType="default"
        scrollEnabled={resolvedScrollEnabled}
        submitBehavior="newline"
        textAlignVertical="top"
        value={localValue}
        className={cn(
          'border-border-secondary bg-input text-foreground rounded-xl border border-continuous',
          fill && 'web:min-h-full flex-1',
          readOnly && 'opacity-50',
          className
        )}
        showSoftInputOnFocus={
          suppressKeyboardUntilTap ? softInputEnabled : undefined
        }
        style={[
          nativeTextStyles[size],
          autoSizeStyle,
          fill && fillStyle,
          style,
        ]}
        {...layoutProps}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
