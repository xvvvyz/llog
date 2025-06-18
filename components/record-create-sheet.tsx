import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useSheetManager } from '@/context/sheet-manager';
import { useLogColor } from '@/hooks/use-log-color';
import { createRecord } from '@/mutations/create-record';
import { useProfile } from '@/queries/use-profile';
import { useState } from 'react';
import { View } from 'react-native';

export const RecordCreateSheet = () => {
  const [text, setText] = useState('');
  const profile = useProfile();
  const sheetManager = useSheetManager();

  const logId = sheetManager.getId('record-create');
  const logColor = useLogColor({ id: logId });

  return (
    <Sheet
      onDismiss={() => sheetManager.close('record-create')}
      open={sheetManager.isOpen('record-create')}
      portalName="record-create"
    >
      <View className="mx-auto w-full max-w-xl gap-3 px-7 py-8">
        <View className="flex-row gap-3">
          <Avatar
            avatar={profile.avatar}
            height={44}
            id={profile.id}
            width={44}
          />
          <Textarea
            autoFocus
            maxLength={10240}
            placeholder="What's happening?"
            onChangeText={setText}
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
