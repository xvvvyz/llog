import { ListActions } from '@/features/logs/components/list-actions';
import { ListEmptyState } from '@/features/logs/components/list-empty-state';
import { ListItem } from '@/features/logs/components/list-item';
import { createLog } from '@/features/logs/mutations/create-log';
import { useLogs } from '@/features/logs/queries/use-logs';
import { useTags } from '@/features/logs/queries/use-tags';
import { TeamSwitcher } from '@/features/teams/components/switcher';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { SPECTRUM } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import MiniSearch from 'minisearch';
import { Plus } from 'phosphor-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function Index() {
  const [rawQuery, setRawQuery] = React.useState('');
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const tags = useTags();
  const { canManage } = useMyRole();
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

  return (
    <Page>
      <Header
        title={<TeamSwitcher />}
        right={
          <View className="flex-row items-center">
            {breakpoints.md && !isEmpty && (
              <ListActions
                className={cn(isEmpty && 'md:hidden')}
                query={rawQuery}
                selectedTagIds={selectedTagIds}
                setQuery={setRawQuery}
                setSelectedTagIds={setSelectedTagIds}
                tags={tags.data}
              />
            )}
            {canManage && (
              <Button
                className="size-11"
                size="icon"
                variant="link"
                wrapperClassName="md:-mr-4 md:ml-4"
                onPress={() => {
                  const logId = id();
                  createLog({ color: 7, id: logId, name: 'Log' });
                  router.push(`/${logId}`);
                }}
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
        <ListEmptyState canManage={canManage} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-2.5 pt-0 md:p-6"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {!breakpoints.md && !isEmpty && (
            <ListActions
              className="p-1.5 pt-4 md:p-2"
              query={rawQuery}
              selectedTagIds={selectedTagIds}
              setQuery={setRawQuery}
              setSelectedTagIds={setSelectedTagIds}
              tags={tags.data}
            />
          )}
          <View className="flex-row flex-wrap">
            {filteredLogs.map((item) => {
              const color =
                SPECTRUM[colorScheme][item.color] ?? SPECTRUM[colorScheme][0];

              const itemTagIds = new Set(
                item.tags.map((tag: { id: string }) => tag.id)
              );

              return (
                <View
                  key={item.id}
                  className={cn(
                    columns === 2 && 'w-1/2',
                    columns === 3 && 'w-1/3',
                    columns === 4 && 'w-1/4',
                    columns === 5 && 'w-1/5',
                    columns === 6 && 'w-1/6'
                  )}
                >
                  <ListItem
                    className="p-1.5 md:p-2"
                    color={color}
                    id={item.id}
                    name={item.name}
                    profiles={item.profiles ?? []}
                    tags={tags.data.filter((tag) => itemTagIds.has(tag.id))}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Page>
  );
}
