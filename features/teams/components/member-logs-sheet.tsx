import { toggleLogMember } from '@/features/logs/mutations/toggle-member';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOptimisticSelection } from '@/hooks/use-optimistic-selection';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';
import { SPECTRUM } from '@/theme/spectrum';
import { Checkbox } from '@/ui/checkbox';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export const MemberLogsSheet = () => {
  const sheetManager = useSheetManager();
  const roleId = sheetManager.getId('member-logs');
  const { activeTeamId } = useUi();
  const colorScheme = useColorScheme();

  const { data, isLoading } = db.useQuery(
    activeTeamId && roleId
      ? {
          logs: {
            $: { order: { name: 'asc' }, where: { team: activeTeamId } },
            profiles: { $: { fields: ['id'] } },
          },
          roles: {
            $: { where: { id: roleId, team: activeTeamId } },
            user: { profile: { $: { fields: ['id'] } } },
          },
        }
      : null
  );

  const logs = React.useMemo(() => data?.logs ?? [], [data?.logs]);
  const profileId = data?.roles?.[0]?.user?.profile?.id;

  const profileLogIds = React.useMemo(
    () =>
      new Set(
        logs
          .filter((log) => log.profiles?.some((p) => p.id === profileId))
          .map((log) => log.id)
      ),
    [logs, profileId]
  );

  const { getSelected, setSelected } = useOptimisticSelection({
    onChange: React.useCallback(
      (logId: string, selected: boolean) => {
        if (!roleId) return Promise.resolve();

        return toggleLogMember({
          roleId,
          selected,
          logId,
          teamId: activeTeamId,
        });
      },
      [activeTeamId, roleId]
    ),
    scopeKey: `${activeTeamId ?? ''}:${roleId ?? ''}`,
    selectedIds: profileLogIds,
  });

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
          const isSelected = getSelected(log.id);
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
                onCheckedChange={(selected) => setSelected(log.id, selected)}
              />
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
};
