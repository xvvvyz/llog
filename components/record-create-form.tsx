import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { createRecord } from '@/mutations/create-record';
import { useState } from 'react';
import { Platform, View } from 'react-native';

export const RecordCreateForm = ({
  className,
  logId,
  onEmptyBlur,
}: {
  className?: string;
  logId?: string;
  onEmptyBlur?: () => void;
}) => {
  const [text, setText] = useState('');

  return (
    <View className={className}>
      <Input
        autoFocus
        className="h-auto pb-16 pt-2.5 leading-normal"
        lineBreakModeIOS="wordWrapping"
        maxLength={10240}
        multiline
        numberOfLines={Platform.select({ ios: 7, web: 3 })}
        onBlur={() => !text && onEmptyBlur?.()}
        onChangeText={setText}
        returnKeyType="default"
        submitBehavior="newline"
        value={text}
      />
      <Button
        disabled={!text.trim()}
        onPress={() => {
          const trimmedText = text.trim();
          if (!trimmedText || !logId) return;
          createRecord({ logId, text: trimmedText });
          setText('');
        }}
        size="xs"
        wrapperClassName="absolute bottom-3 right-3"
      >
        <Text>Record</Text>
      </Button>
    </View>
  );
};
