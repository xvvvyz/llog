import { Checkbox } from '@/components/ui/checkbox';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toggleLogMember } from '@/mutations/toggle-log-member';
import { useUi } from '@/queries/use-ui';
import { SPECTRUM } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

export const MemberLogsSheet = () => {
  const sheetManager = useSheetManager();
  const profileId = sheetManager.getId('member-logs');
  const { activeTeamId } = useUi();
  const colorScheme = useColorScheme();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? {
          logs: {
            $: {
              order: { name: 'asc' },
              where: { team: activeTeamId },
            },
            profiles: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);

  const profileLogIds = useMemo(
    () =>
      new Set(
        logs
          .filter((log) => log.profiles?.some((p) => p.id === profileId))
          .map((log) => log.id)
      ),
    [logs, profileId]
  );

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('member-logs')}
      open={sheetManager.isOpen('member-logs')}
      portalName="member-logs"
    >
      <ScrollView
        contentContainerClassName="w-full p-8 sm:mx-auto sm:max-w-sm"
        keyboardShouldPersistTaps="always"
      >
        {logs.map((log) => {
          const isSelected = profileLogIds.has(log.id);
          const color = SPECTRUM[colorScheme][log.color ?? 11];

          return (
            <View
              className="flex-row items-center justify-between py-1.5"
              key={log.id}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="size-8 rounded-xl"
                  style={{ backgroundColor: color.default }}
                />
                <Text numberOfLines={1}>{log.name}</Text>
              </View>
              <Checkbox
                checked={isSelected}
                className="size-8 border-0"
                onCheckedChange={() =>
                  toggleLogMember({
                    profileId: profileId!,
                    isSelected,
                    logId: log.id,
                  })
                }
              />
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
};
