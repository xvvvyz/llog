import { AttachmentSummary } from '@/features/records/components/attachment-summary';
import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { useVirtualKeyboardVisible } from '@/hooks/use-virtual-keyboard-visible';
import { Button } from '@/ui/button';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { Platform, View } from 'react-native';

export const ComposerForm = ({
  attachmentCount,
  hasContent,
  isBusy,
  isOpen,
  isSubmitting,
  isTextareaFocused,
  logColor,
  mediaPreview,
  onChangeText,
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
  hasContent: boolean;
  isBusy: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  isTextareaFocused: boolean;
  logColor?: string;
  mediaPreview: React.ReactNode;
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
  const shouldAutoFocus = Platform.OS !== 'web';
  const isVirtualKeyboardVisible = useVirtualKeyboardVisible(isTextareaFocused);
  const isComposerCompact = isTextareaFocused && isVirtualKeyboardVisible;

  React.useEffect(() => {
    if (isOpen) return;
    onTextareaFocusChange(false);
  }, [isOpen, onTextareaFocusChange]);

  const handleTextareaFocus = React.useCallback(() => {
    onTextareaFocusChange(true);
  }, [onTextareaFocusChange]);

  const handleTextareaBlur = React.useCallback(
    (event: unknown) => {
      const rawText = readTextareaBlurText(event, text);
      const nextText = rawText.trim();
      if (nextText !== rawText || nextText !== text) onChangeText(nextText);
      onTextareaFocusChange(false);
    },
    [onChangeText, onTextareaFocusChange, text]
  );

  return (
    <View className="mx-auto max-h-full max-w-lg min-h-0 w-full">
      <View className="max-h-full min-h-0 p-4 pb-8 gap-3 sm:pt-8">
        <View className="overflow-hidden min-h-0 border-border-secondary rounded-xl bg-input border shrink">
          <Textarea
            autoFocus={shouldAutoFocus}
            className="border-0 bg-transparent"
            maxLength={10240}
            maxRows={7}
            minRows={1}
            onBlur={handleTextareaBlur}
            onChangeText={onChangeText}
            onFocus={handleTextareaFocus}
            placeholder={placeholder}
            value={text}
          />
          {isComposerCompact ? null : mediaPreview}
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
            <Text className={submitTextClassName}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
};
