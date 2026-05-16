import { useUi } from '@/features/account/queries/use-ui';
import { toggleLogMember } from '@/features/logs/mutations/toggle-member';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useNameSearch } from '@/hooks/use-name-search';
import { useOptimisticSelection } from '@/hooks/use-optimistic-selection';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { SPECTRUM } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { SearchInput } from '@/ui/search-input';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export const MemberLogsSheet = () => {
  const [query, setQuery] = React.useState('');
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('member-logs');
  const roleId = sheetManager.getId('member-logs');
  const { activeTeamId } = useUi();
  const payload = sheetManager.getPayload('member-logs');
  const teamId = payload?.teamId ?? activeTeamId;
  const colorScheme = useColorScheme();

  const { data, isLoading } = db.useQuery(
    open && teamId && roleId
      ? {
          logs: {
            $: { order: { name: 'asc' }, where: { team: teamId } },
            profiles: { $: { fields: ['id'] } },
          },
          roles: {
            $: { where: { id: roleId, team: teamId } },
            user: { profile: { $: { fields: ['id'] } } },
          },
        }
      : null
  );

  const queryKey = open && teamId && roleId ? `${teamId}:${roleId}` : undefined;
  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  const logs = React.useMemo(
    () => (hasCurrentResult ? (data?.logs ?? []) : []),
    [data?.logs, hasCurrentResult]
  );

  const profileId = hasCurrentResult
    ? data?.roles?.find((role) => role.id === roleId)?.user?.profile?.id
    : undefined;

  React.useEffect(() => {
    if (open) setQuery('');
  }, [open, roleId]);

  const visibleLogs = useNameSearch(logs, query);

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
        return toggleLogMember({ roleId, selected, logId, teamId });
      },
      [teamId, roleId]
    ),
    scopeKey: `${teamId ?? ''}:${roleId ?? ''}`,
    selectedIds: profileLogIds,
  });

  return (
    <Sheet
      loading={!!queryKey && (isLoading || !hasCurrentResult)}
      onDismiss={() => sheetManager.close('member-logs')}
      open={open}
      portalName="member-logs"
      variant="list"
    >
      {!!visibleLogs.length && (
        <SheetListScrollView variant="rows">
          {visibleLogs.map((log) => {
            const isSelected = getSelected(log.id);
            const color = SPECTRUM[colorScheme][log.color ?? 11];

            return (
              <View
                key={log.id}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row gap-4 items-center">
                  <View
                    className="size-4 border-continuous rounded-md"
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
        </SheetListScrollView>
      )}
      <SheetFooter contentClassName="flex-row gap-4">
        <SearchInput
          query={query}
          setQuery={setQuery}
          size="sm"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button
          onPress={() => sheetManager.close('member-logs')}
          size="sm"
          variant="secondary"
          wrapperClassName="shrink-0"
        >
          <Text>Close</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
