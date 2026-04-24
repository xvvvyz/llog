import { useColorScheme } from '@/hooks/use-color-scheme';
import { SPECTRUM } from '@/theme/spectrum';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

type InviteLog = { color?: number | null; id: string; name: string };

export const InviteLogsSheetContent = ({
  action,
  copied,
  isLoading,
  logs,
  onConfirm,
  onToggleLog,
  selectedLogIds,
}: {
  action?: 'copy' | 'qr';
  copied: boolean;
  isLoading: boolean;
  logs: InviteLog[];
  onConfirm: () => void;
  onToggleLog: (logId: string) => void;
  selectedLogIds: Set<string>;
}) => {
  const colorScheme = useColorScheme();

  const buttonLabel = copied
    ? 'Copied!'
    : action === 'qr'
      ? 'Show QR code'
      : 'Copy link';

  return (
    <ScrollView
      contentContainerClassName="w-full p-8 sm:mx-auto sm:max-w-sm"
      keyboardShouldPersistTaps="always"
    >
      {logs.map((log) => {
        const isSelected = selectedLogIds.has(log.id);
        const color = SPECTRUM[colorScheme][log.color ?? 11];

        return (
          <View
            key={log.id}
            className="flex-row py-2.5 items-center justify-between"
          >
            <View className="flex-row gap-3 items-center">
              <View
                className="size-4 rounded-md"
                style={{ backgroundColor: color.default }}
              />
              <Text numberOfLines={1}>{log.name}</Text>
            </View>
            <Checkbox
              checked={isSelected}
              className="size-8 border-0"
              onCheckedChange={() => onToggleLog(log.id)}
            />
          </View>
        );
      })}
      <Button
        disabled={selectedLogIds.size === 0 || isLoading}
        onPress={onConfirm}
        wrapperClassName="mt-4"
      >
        {isLoading ? (
          <ActivityIndicator color={UI.light.contrastForeground} size="small" />
        ) : (
          <Text>{buttonLabel}</Text>
        )}
      </Button>
    </ScrollView>
  );
};
