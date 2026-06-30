import { useUi } from '@/features/account/queries/use-ui';
import { ListActions } from '@/features/logs/components/list-actions';
import { ListEmptyState } from '@/features/logs/components/list-empty-state';
import { ListItem } from '@/features/logs/components/list-item';
import { createLog } from '@/features/logs/mutations/create-log';
import { clearUiLogsFilterTags } from '@/features/logs/mutations/update-ui-filter';
import { useLogs } from '@/features/logs/queries/use-logs';
import { useTags } from '@/features/tags/queries/use-tags';
import type { Tag } from '@/features/tags/types/tag';
import { TeamSwitcher } from '@/features/teams/components/switcher';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/lib/cn';
import { createSearchIndex } from '@/lib/search';
import { Button } from '@/ui/button';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

type LogSearchDocument = {
  id: string;
  name: string;
  people: string;
  tagText: string;
};

export default function Index() {
  const [rawQuery, setRawQuery] = React.useState('');
  const breakpoints = useBreakpoints();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const tags = useTags();
  const ui = useUi();
  const { canManage } = useMyRole();
  const query = React.useMemo(() => rawQuery?.trim(), [rawQuery]);
  const logs = useLogs();
  const hasNoLogs = logs.data.length === 0;

  const handleCreateLog = React.useCallback(() => {
    const logId = id();
    router.push(`/${logId}`);

    const createBlankLog = async () => {
      try {
        await createLog({ color: 7, id: logId, name: 'Log' });
      } catch (error) {
        console.error('Failed to create log', error);
      }
    };

    void createBlankLog();
  }, []);

  const handleClearFilter = React.useCallback(() => {
    void clearUiLogsFilterTags({ tagIds: ui.logsFilterTagIds, uiId: ui.id });
  }, [ui.id, ui.logsFilterTagIds]);

  const tagsById = React.useMemo(
    () => new Map(tags.data.map((tag) => [tag.id, tag])),
    [tags.data]
  );

  const miniSearch = React.useMemo(() => {
    return createSearchIndex<LogSearchDocument>({
      documents: logs.data.map((log) => {
        const tagNames: string[] = [];

        for (const tag of log.tags) {
          const name = tagsById.get(tag.id)?.name?.trim();
          if (name) tagNames.push(name);
        }

        return {
          id: log.id,
          name: log.name,
          people:
            log.profiles?.map((p: { name: string }) => p.name).join(' ') ?? '',
          tagText: tagNames.join(' '),
        };
      }),
      fields: ['name', 'people', 'tagText'],
      storeFields: ['id'],
    });
  }, [logs.data, tagsById]);

  const selectedTagIds = React.useMemo(
    () => new Set(ui.logsFilterTagIds),
    [ui.logsFilterTagIds]
  );

  const filteredLogs = React.useMemo(() => {
    let result = logs.data;

    if (selectedTagIds.size) {
      result = result.filter((log) =>
        log.tags.some((tag) => selectedTagIds.has(tag.id))
      );
    }

    if (query) {
      const matchIds = new Set(miniSearch.search(query).map((r) => r.id));
      result = result.filter((log) => matchIds.has(log.id));
    }

    return result;
  }, [miniSearch, logs.data, query, selectedTagIds]);

  const tagsByLogId = React.useMemo(() => {
    const map = new Map<string, Tag[]>();

    for (const log of filteredLogs) {
      const logTags: Tag[] = [];

      for (const tag of log.tags) {
        const item = tagsById.get(tag.id);
        if (item) logTags.push(item);
      }

      map.set(log.id, logTags);
    }

    return map;
  }, [filteredLogs, tagsById]);

  return (
    <Page>
      <Header
        title={<TeamSwitcher />}
        right={
          <View className="flex-row items-center">
            {breakpoints.md && !hasNoLogs && (
              <ListActions
                query={rawQuery}
                setQuery={setRawQuery}
                tags={tags.data}
              />
            )}
            {canManage && (
              <Button
                className="size-11"
                onPress={handleCreateLog}
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
      {logs.isLoading ? (
        <Loading />
      ) : hasNoLogs ? (
        <ListEmptyState canManage={canManage} onCreateLog={handleCreateLog} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-2.5 pt-0 md:p-6"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {!breakpoints.md && !hasNoLogs && (
            <ListActions
              className="p-1.5 pt-4 md:p-2"
              query={rawQuery}
              setQuery={setRawQuery}
              tags={tags.data}
            />
          )}
          {filteredLogs.length === 0 ? (
            <View className="flex-1 px-3 py-16 gap-6 items-center justify-center">
              <Text className="text-center text-muted-foreground">
                No logs match.
              </Text>
              {selectedTagIds.size > 0 && (
                <Button onPress={handleClearFilter} variant="secondary">
                  <Text>Clear filters</Text>
                </Button>
              )}
            </View>
          ) : (
            <View className="flex-row flex-wrap">
              {filteredLogs.map((item) => (
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
                    color={item.color}
                    id={item.id}
                    name={item.name}
                    profiles={item.profiles ?? []}
                    tags={tagsByLogId.get(item.id) ?? []}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Page>
  );
}
