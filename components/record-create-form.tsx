import { createRecord } from '@/mutations/create-record';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Text } from './ui/text';

export const RecordCreateForm = ({
  className,
  logId,
  onEmptyBlur,
  placeholder,
}: {
  className?: string;
  logId?: string;
  onEmptyBlur?: () => void;
  placeholder: string;
}) => {
  const [text, setText] = useState('');

  return (
    <View className={className}>
      <Input
        autoFocus
        className="h-auto pb-16 pt-3"
        lineBreakModeIOS="wordWrapping"
        maxLength={10240}
        multiline
        numberOfLines={Platform.select({ ios: 7, web: 3 })}
        onBlur={() => !text && onEmptyBlur?.()}
        onChangeText={setText}
        placeholder={placeholder}
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
        <Text>Save</Text>
      </Button>
    </View>
  );
};
