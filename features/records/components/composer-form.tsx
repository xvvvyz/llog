import { AttachmentSummary } from '@/features/records/components/attachment-summary';
import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { useVirtualKeyboardVisible } from '@/hooks/use-virtual-keyboard-visible';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { Platform, View } from 'react-native';

export const ComposerForm = ({
  attachmentCount,
  autoFocusOnNative = true,
  hasContent,
  isBusy,
  isOpen,
  isSubmitting,
  isTextInputDisabled = false,
  isTextareaFocused,
  logColor,
  filePreview,
  onChangeText,
  inputAccessory,
  inputAction,
  onSubmit,
  onTextareaFocusChange,
  placeholder,
  submitLabel,
  submitTextClassName,
  submitVariant,
  text,
  toolbar,
}: {
  attachmentCount: number;
  autoFocusOnNative?: boolean;
  hasContent: boolean;
  isBusy: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  isTextInputDisabled?: boolean;
  isTextareaFocused: boolean;
  logColor?: string;
  filePreview: React.ReactNode;
  inputAccessory?: React.ReactNode;
  inputAction?: React.ReactNode;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onTextareaFocusChange: (isFocused: boolean) => void;
  placeholder: string;
  submitLabel: string;
  submitTextClassName?: string;
  submitVariant?: React.ComponentPropsWithoutRef<typeof Button>['variant'];
  text: string;
  toolbar: React.ReactNode;
}) => {
  const shouldAutoFocus =
    Platform.OS !== 'web' && autoFocusOnNative && !isTextInputDisabled;

  const isVirtualKeyboardVisible = useVirtualKeyboardVisible(isTextareaFocused);
  const isComposerCompact = isTextareaFocused && isVirtualKeyboardVisible;
  const showInputAccessory = !isComposerCompact && !!inputAccessory;
  const showInputAction = !isComposerCompact && !!inputAction;

  React.useEffect(() => {
    if (isOpen) return;
    onTextareaFocusChange(false);
  }, [isOpen, onTextareaFocusChange]);

  const handleTextareaFocus = React.useCallback(() => {
    if (isTextInputDisabled) return;
    onTextareaFocusChange(true);
  }, [isTextInputDisabled, onTextareaFocusChange]);

  const handleTextareaBlur = React.useCallback(
    (event: unknown) => {
      if (isTextInputDisabled) {
        onTextareaFocusChange(false);
        return;
      }

      const rawText = readTextareaBlurText(event, text);
      const nextText = rawText.trim();
      if (nextText !== rawText || nextText !== text) onChangeText(nextText);
      onTextareaFocusChange(false);
    },
    [isTextInputDisabled, onChangeText, onTextareaFocusChange, text]
  );

  return (
    <View className="mx-auto max-h-full max-w-lg min-h-0 w-full">
      <View className="max-h-full min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
        <View className="overflow-hidden min-h-0 border-border-secondary border-continuous rounded-xl bg-input border shrink">
          {showInputAccessory && (
            <View className="border-b border-border-secondary border-continuous">
              {inputAccessory}
            </View>
          )}
          <View className="relative">
            <Textarea
              autoFocus={shouldAutoFocus}
              maxLength={10240}
              maxRows={7}
              minRows={1}
              onBlur={handleTextareaBlur}
              onChangeText={onChangeText}
              onFocus={handleTextareaFocus}
              placeholder={placeholder}
              readOnly={isTextInputDisabled}
              size="sm"
              value={text}
              className={cn(
                'border-0 bg-transparent',
                isTextInputDisabled && 'opacity-50',
                showInputAction && 'pr-32'
              )}
            />
            {showInputAction && (
              <View className="absolute right-1 top-1">{inputAction}</View>
            )}
          </View>
          {isComposerCompact ? null : filePreview}
        </View>
        <View className="flex-row px-4 gap-3 items-center shrink-0">
          <View className="flex-1 flex-row gap-3 items-center">
            {isComposerCompact ? (
              <AttachmentSummary count={attachmentCount} />
            ) : (
              toolbar
            )}
          </View>
          <Button
            className="active:opacity-90 web:hover:opacity-90"
            disabled={isBusy || isSubmitting || !hasContent}
            onPress={onSubmit}
            size="xs"
            style={logColor ? { backgroundColor: logColor } : undefined}
            variant={submitVariant}
          >
            {isSubmitting ? (
              <Spinner color={logColor ? 'white' : undefined} />
            ) : (
              <Text className={submitTextClassName}>{submitLabel}</Text>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
};
