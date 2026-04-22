import { Button } from '@/ui/button';
import { Text } from '@/ui/text';
import { Textarea } from '@/ui/textarea';
import * as React from 'react';
import { type StyleProp, type TextStyle, View } from 'react-native';

export const ReplyCreateSheetForm = ({
  hasContent,
  isBusy,
  isSubmitting,
  logColor,
  mediaPreview,
  nativeComposerMaxHeight,
  nativeTextareaStyle,
  onChangeText,
  onSubmit,
  submitLabel,
  text,
  toolbar,
}: {
  hasContent: boolean;
  isBusy: boolean;
  isSubmitting: boolean;
  logColor?: string;
  mediaPreview: React.ReactNode;
  nativeComposerMaxHeight?: number;
  nativeTextareaStyle?: StyleProp<TextStyle>;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  text: string;
  toolbar: React.ReactNode;
}) => {
  return (
    <View className="mx-auto w-full max-w-lg gap-3 p-4 pb-8 sm:pt-8">
      <View
        className="border-border-secondary bg-input web:max-h-[40dvh] web:md:max-h-[60dvh] rounded-xl border"
        style={
          nativeComposerMaxHeight
            ? { maxHeight: nativeComposerMaxHeight }
            : undefined
        }
      >
        <Textarea
          autoFocus
          className="max-h-[180px] min-h-[120px] border-0 bg-transparent"
          maxLength={10240}
          numberOfLines={8}
          onChangeText={onChangeText}
          placeholder="Add a reply"
          style={nativeTextareaStyle}
          value={text}
        />
        {mediaPreview}
      </View>
      <View className="flex-row items-center gap-3 px-4">
        <View className="flex-1 flex-row items-center gap-3">{toolbar}</View>
        <Button
          className="web:hover:opacity-90 active:opacity-90"
          disabled={isBusy || isSubmitting || !hasContent}
          onPress={onSubmit}
          size="xs"
          style={logColor ? { backgroundColor: logColor } : undefined}
          variant="secondary"
        >
          <Text className="text-contrast-foreground">
            {isSubmitting ? 'Saving…' : submitLabel}
          </Text>
        </Button>
      </View>
    </View>
  );
};
