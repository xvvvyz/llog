import { LogListActions } from '@/components/log-list-actions';
import { LogListEmptyState } from '@/components/log-list-empty-state';
import { LogListItem } from '@/components/log-list-item';
import { TeamSwitcher } from '@/components/team-switcher';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { useSheetManager } from '@/context/sheet-manager';
import { useGridColumns as useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLog } from '@/mutations/create-log';
import { useHasNoLogs } from '@/queries/use-has-no-logs';
import { useLogTags } from '@/queries/use-log-tags';
import { useLogs } from '@/queries/use-logs';
import { useMyRole } from '@/queries/use-my-role';
import { SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import MiniSearch from 'minisearch';
import { Plus } from 'phosphor-react-native';
import { ReactElement, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

export default function Index() {
  const [rawQuery, setRawQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const isEmpty = useHasNoLogs();
  const logTags = useLogTags();
  const { canManage } = useMyRole();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const query = useMemo(() => rawQuery?.trim(), [rawQuery]);
  const logs = useLogs();

  const miniSearch = useMemo(() => {
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

  const filteredLogs = useMemo(() => {
    let result = logs.data;

    if (query) {
      const matchIds = new Set(miniSearch.search(query).map((r) => r.id));
      result = result.filter((log) => matchIds.has(log.id));
    }

    if (selectedTagIds.length) {
      const tagIdSet = new Set(selectedTagIds);

      result = result.filter((log) =>
        log.logTags.some((tag: { id: string }) => tagIdSet.has(tag.id))
      );
    }

    return result;
  }, [query, selectedTagIds, logs.data, miniSearch]);

  const hasLoadedRef = useRef(false);
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
                logTags={logTags.data}
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
                logTags={logTags.data}
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
          keyboardShouldPersistTaps="always"
          numColumns={columns}
          renderItem={({ item }) => {
            const color =
              SPECTRUM[colorScheme][item.color] ?? SPECTRUM[colorScheme][0];

            const itemLogTagIds = new Set(
              item.logTags.map((tag: { id: string }) => tag.id)
            );

            return (
              <LogListItem
                className="p-1.5 md:p-2"
                color={color.default}
                id={item.id}
                name={item.name}
                profiles={item.profiles ?? []}
                tags={logTags.data.filter((tag) => itemLogTagIds.has(tag.id))}
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
