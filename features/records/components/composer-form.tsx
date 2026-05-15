import { AttachmentSummary } from '@/features/records/components/attachment-summary';
import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { useVirtualKeyboardVisible } from '@/hooks/use-virtual-keyboard-visible';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Page } from '@/ui/page';
import { Sheet } from '@/ui/sheet';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import { CornersOut } from 'phosphor-react-native';
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
  fullscreenPortalName,
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
  fullscreenPortalName: string;
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
  const showFullscreenAction = !isTextareaFocused;
  const showInputActionOverlay = showInputAction || showFullscreenAction;
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) return;
    onTextareaFocusChange(false);
    setIsFullscreenOpen(false);
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

  const textareaPaddingClassName = showInputAction
    ? showFullscreenAction
      ? 'pr-44'
      : 'pr-32'
    : showFullscreenAction
      ? 'pr-14'
      : undefined;

  return (
    <React.Fragment>
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
                  textareaPaddingClassName
                )}
              />
              {showInputActionOverlay && (
                <View className="absolute right-1 top-1 flex-row gap-1">
                  {showInputAction && inputAction}
                  {showFullscreenAction && (
                    <Button
                      className="h-8 w-8 rounded-lg"
                      disabled={isTextInputDisabled}
                      onPress={() => setIsFullscreenOpen(true)}
                      size="icon"
                      variant="ghost"
                      wrapperClassName="rounded-lg border-continuous"
                    >
                      <Icon
                        className="text-muted-foreground"
                        icon={CornersOut}
                        size={20}
                      />
                    </Button>
                  )}
                </View>
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
      <Sheet
        className="h-full"
        onDismiss={() => setIsFullscreenOpen(false)}
        open={isOpen && isFullscreenOpen}
        portalName={fullscreenPortalName}
      >
        <Page className="flex-col overflow-hidden max-h-full min-h-0 bg-popover">
          <View className="flex-1 mx-auto max-h-full max-w-lg min-h-0 w-full">
            <View className="flex-1 min-h-0 p-4 pb-4 gap-3 md:p-4 sm:pt-8">
              <View className="relative flex-1 overflow-hidden min-h-0 border-border-secondary border-continuous rounded-2xl bg-input border">
                <Textarea
                  autoFocus
                  maxLength={10240}
                  onBlur={handleTextareaBlur}
                  onChangeText={onChangeText}
                  onFocus={handleTextareaFocus}
                  placeholder={placeholder}
                  readOnly={isTextInputDisabled}
                  style={Platform.OS === 'web' ? { height: '100%' } : undefined}
                  value={text}
                  className={cn(
                    'min-h-full flex-1 border-0 rounded-2xl bg-transparent',
                    isTextInputDisabled && 'opacity-50'
                  )}
                />
              </View>
              <View className="flex-row px-4 gap-3 items-center shrink-0">
                <View className="flex-1" />
                <Button
                  onPress={() => setIsFullscreenOpen(false)}
                  size="xs"
                  variant="secondary"
                >
                  <Text>Done</Text>
                </Button>
              </View>
            </View>
          </View>
        </Page>
      </Sheet>
    </React.Fragment>
  );
};
