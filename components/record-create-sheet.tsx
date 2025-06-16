import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { createRecord } from '@/mutations/create-record';
import { useProfile } from '@/queries/use-profile';
import { useCallback, useRef, useState } from 'react';

import { useLogColor } from '@/hooks/use-log-color';
import {
  NativeSyntheticEvent,
  Platform,
  TextInputContentSizeChangeEventData,
  View,
} from 'react-native';
import { Avatar } from './ui/avatar';

export const RecordCreateSheet = () => {
  const [inputHeight, setInputHeight] = useState(44);
  const [text, setText] = useState('');
  const lastUpdateTime = useRef<number>(0);
  const pendingHeight = useRef<number>(88);
  const profile = useProfile();
  const sheetManager = useSheetManager();

  const logId = sheetManager.getId('record-create');
  const logColor = useLogColor({ id: logId });

  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const maxHeight = 256;
      const minHeight = 88;
      const newHeight = e.nativeEvent.contentSize.height;
      const now = Date.now();

      if (!text) {
        pendingHeight.current = minHeight;
        setInputHeight(minHeight);
        lastUpdateTime.current = now;
        return;
      }

      pendingHeight.current = Math.min(
        Math.max(minHeight, newHeight),
        maxHeight
      );

      if (now - lastUpdateTime.current >= 16) {
        setInputHeight(pendingHeight.current);
        lastUpdateTime.current = now;
      }
    },
    [text]
  );

  return (
    <Sheet
      onDismiss={() => sheetManager.close('record-create')}
      open={sheetManager.isOpen('record-create')}
      portalName="record-create"
    >
      <View className="mx-auto w-full max-w-xl gap-3 px-7 py-8">
        <View className="flex-row gap-3">
          <Avatar avatar={profile.avatar} id={profile.id} />
          <Input
            autoFocus
            className="py-2.5 leading-normal"
            lineBreakModeIOS="wordWrapping"
            maxLength={10240}
            placeholder="What's happening?"
            multiline
            numberOfLines={Platform.select({ ios: 7, web: 3 })}
            onChangeText={setText}
            onContentSizeChange={handleContentSizeChange}
            returnKeyType="default"
            style={{ height: inputHeight }}
            submitBehavior="newline"
            value={text}
          />
        </View>
        <View className="flex-row justify-end">
          <Button
            className="text-white web:hover:opacity-90"
            disabled={!text.trim()}
            onPress={() => {
              const trimmedText = text.trim();
              if (!trimmedText || !logId) return;
              createRecord({ logId: logId, text: trimmedText });
              sheetManager.close('record-create');
              setText('');
            }}
            size="sm"
            style={{ backgroundColor: logColor.default }}
          >
            <Text>Record</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
