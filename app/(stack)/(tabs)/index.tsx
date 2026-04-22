import { LogListActions } from '@/features/logs/components/log-list-actions';
import { LogListEmptyState } from '@/features/logs/components/log-list-empty-state';
import { LogListItem } from '@/features/logs/components/log-list-item';
import { createLog } from '@/features/logs/mutations/create-log';
import { useTags } from '@/features/logs/queries/use-log-tags';
import { useLogs } from '@/features/logs/queries/use-logs';
import { TeamSwitcher } from '@/features/teams/components/team-switcher';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useGridColumns as useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { SPECTRUM } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import MiniSearch from 'minisearch';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import * as React from 'react';
import { View } from 'react-native';

export default function Index() {
  const [rawQuery, setRawQuery] = React.useState('');
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const tags = useTags();
  const { canManage } = useMyRole();
  const renderCacheRef = React.useRef<React.ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const query = React.useMemo(() => rawQuery?.trim(), [rawQuery]);
  const logs = useLogs();
  const isEmpty = !logs.isLoading && logs.data.length === 0;

  const miniSearch = React.useMemo(() => {
    const ms = new MiniSearch({
      fields: ['name', 'people'],
      storeFields: ['id'],
      searchOptions: { fuzzy: 0.2, prefix: true, boost: { name: 2 } },
    });

    ms.addAll(
      logs.data.map((log) => ({
        id: log.id,
        name: log.name,
        people:
          log.profiles?.map((p: { name: string }) => p.name).join(' ') ?? '',
      }))
    );

    return ms;
  }, [logs.data]);

  const filteredLogs = React.useMemo(() => {
    let result = logs.data;

    if (query) {
      const matchIds = new Set(miniSearch.search(query).map((r) => r.id));
      result = result.filter((log) => matchIds.has(log.id));
    }

    if (selectedTagIds.length) {
      const tagIdSet = new Set(selectedTagIds);

      result = result.filter((log) =>
        log.tags.some((tag: { id: string }) => tagIdSet.has(tag.id))
      );
    }

    return result;
  }, [query, selectedTagIds, logs.data, miniSearch]);

  const hasLoadedRef = React.useRef(false);
  if (!logs.isLoading) hasLoadedRef.current = true;
  if (sheetManager.someOpen()) return renderCacheRef.current;

  renderCacheRef.current = (
    <Page>
      <Header
        title={<TeamSwitcher />}
        right={
          <View className="flex-row items-center">
            {breakpoints.md && !isEmpty && (
              <LogListActions
                className={cn(isEmpty && 'md:hidden')}
                tags={tags.data}
                query={rawQuery}
                selectedTagIds={selectedTagIds}
                setQuery={setRawQuery}
                setSelectedTagIds={setSelectedTagIds}
              />
            )}
            {canManage && (
              <Button
                className="size-11"
                onPress={() => {
                  const logId = id();
                  createLog({ color: 7, id: logId, name: 'Log' });
                  router.push(`/${logId}`);
                }}
                size="icon"
                variant="link"
                wrapperClassName="md:-mr-4 md:ml-4"
              >
                <Icon className="text-foreground" icon={Plus} size={24} />
              </Button>
            )}
          </View>
        }
      />
      {logs.isLoading && !hasLoadedRef.current ? (
        <Loading />
      ) : isEmpty ? (
        <LogListEmptyState canManage={canManage} />
      ) : (
        <List
          ListHeaderComponent={
            !breakpoints.md && !isEmpty ? (
              <LogListActions
                className="p-1.5 pt-4 md:p-2"
                tags={tags.data}
                query={rawQuery}
                selectedTagIds={selectedTagIds}
                setQuery={setRawQuery}
                setSelectedTagIds={setSelectedTagIds}
              />
            ) : null
          }
          contentContainerClassName="p-2.5 pt-0 md:p-6"
          data={filteredLogs}
          estimatedItemSize={112}
          key={`grid-${columns}`}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          numColumns={columns}
          renderItem={({ item }) => {
            const color =
              SPECTRUM[colorScheme][item.color] ?? SPECTRUM[colorScheme][0];

            const itemTagIds = new Set(
              item.tags.map((tag: { id: string }) => tag.id)
            );

            return (
              <LogListItem
                className="p-1.5 md:p-2"
                color={color}
                id={item.id}
                name={item.name}
                profiles={item.profiles ?? []}
                tags={tags.data.filter((tag) => itemTagIds.has(tag.id))}
              />
            );
          }}
          wrapperClassName="flex-1"
        />
      )}
    </Page>
  );

  return renderCacheRef.current;
}
