import { useLogs } from '@/features/logs/queries/use-logs';
import { ResultItem } from '@/features/search/components/result-item';
import { useSearch } from '@/features/search/hooks/use-search';
import { SearchResult } from '@/features/search/types/search';
import { useTags } from '@/features/tags/queries/use-tags';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { SPECTRUM } from '@/theme/spectrum';
import { Button } from '@/ui/button';
import * as DropdownMenu from '@/ui/dropdown-menu';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { List } from '@/ui/list';
import { Page } from '@/ui/page';
import { SearchInput } from '@/ui/search-input';
import { Text } from '@/ui/text';
import { Funnel } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export default function Search() {
  const [query, setQuery] = React.useState('');
  const [selectedLogIds, setSelectedLogIds] = React.useState<string[]>([]);

  const [selectedLogTagIds, setSelectedLogTagIds] = React.useState<string[]>(
    []
  );

  const [selectedRecordTagIds, setSelectedRecordTagIds] = React.useState<
    string[]
  >([]);

  const colorScheme = useColorScheme();
  const { teams } = useTeams();
  const teamIds = React.useMemo(() => teams.map((team) => team.id), [teams]);
  const logs = useLogs({ teamIds });
  const logTags = useTags({ teamIds });
  const recordTags = useTags({ teamIds, type: 'record' });

  const { results } = useSearch({
    query,
    logIds: selectedLogIds.length ? selectedLogIds : undefined,
    logTagIds: selectedLogTagIds.length ? selectedLogTagIds : undefined,
    recordTagIds: selectedRecordTagIds.length
      ? selectedRecordTagIds
      : undefined,
  });

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
      setter((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );

  const toggleLogId = toggle(setSelectedLogIds);
  const toggleLogTagId = toggle(setSelectedLogTagIds);
  const toggleRecordTagId = toggle(setSelectedRecordTagIds);

  const logIdSet = React.useMemo(
    () => new Set(selectedLogIds),
    [selectedLogIds]
  );

  const logTagIdSet = React.useMemo(
    () => new Set(selectedLogTagIds),
    [selectedLogTagIds]
  );

  const recordTagIdSet = React.useMemo(
    () => new Set(selectedRecordTagIds),
    [selectedRecordTagIds]
  );

  const hasFilters =
    selectedLogIds.length > 0 ||
    selectedLogTagIds.length > 0 ||
    selectedRecordTagIds.length > 0;

  const hasFilterOptions =
    !!logs.data.length || !!logTags.data.length || !!recordTags.data.length;

  const renderItem = React.useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => (
      <ResultItem
        result={item}
        className={cn(
          index === 0 ? 'mt-0' : 'mt-3',
          index === results.length - 1 && 'mb-4 md:mb-8'
        )}
      />
    ),
    [results.length]
  );

  return (
    <Page>
      <Header title="Search" />
      <List
        contentContainerClassName="mx-auto w-full max-w-lg px-4 pt-4 md:pt-8"
        data={query.trim() ? results : []}
        estimatedItemSize={100}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => `${item.type}:${item.id}`}
        renderItem={renderItem}
        ListHeaderComponent={
          <View className="pb-3 gap-3">
            <View className="flex-row gap-3">
              <SearchInput
                query={query}
                setQuery={setQuery}
                wrapperClassName="flex-1"
              />
              {hasFilterOptions && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button size="icon" variant="secondary">
                      <Icon
                        className="text-secondary-foreground"
                        icon={Funnel}
                      />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" className="min-w-48">
                    {!!logs.data.length && (
                      <>
                        <DropdownMenu.Label>Logs</DropdownMenu.Label>
                        {logs.data.map((log) => {
                          const color = SPECTRUM[colorScheme][log.color];

                          return (
                            <DropdownMenu.CheckboxItem
                              key={log.id}
                              checked={logIdSet.has(log.id)}
                              onCheckedChange={() => toggleLogId(log.id)}
                            >
                              <View
                                className="size-3 border-continuous rounded-[2px]"
                                style={{ backgroundColor: color?.default }}
                              />
                              <Text>{log.name}</Text>
                            </DropdownMenu.CheckboxItem>
                          );
                        })}
                      </>
                    )}
                    {!!logTags.data.length && (
                      <>
                        {!!logs.data.length && <DropdownMenu.Separator />}
                        <DropdownMenu.Label>Log tags</DropdownMenu.Label>
                        {logTags.data.map((tag) => (
                          <DropdownMenu.CheckboxItem
                            key={tag.id}
                            checked={logTagIdSet.has(tag.id)}
                            onCheckedChange={() => toggleLogTagId(tag.id)}
                          >
                            <Text>{tag.name}</Text>
                          </DropdownMenu.CheckboxItem>
                        ))}
                      </>
                    )}
                    {!!recordTags.data.length && (
                      <>
                        {(!!logs.data.length || !!logTags.data.length) && (
                          <DropdownMenu.Separator />
                        )}
                        <DropdownMenu.Label>Record tags</DropdownMenu.Label>
                        {recordTags.data.map((tag) => (
                          <DropdownMenu.CheckboxItem
                            key={tag.id}
                            checked={recordTagIdSet.has(tag.id)}
                            onCheckedChange={() => toggleRecordTagId(tag.id)}
                          >
                            <Text>{tag.name}</Text>
                          </DropdownMenu.CheckboxItem>
                        ))}
                      </>
                    )}
                    {hasFilters && (
                      <>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          onPress={() => {
                            setSelectedLogIds([]);
                            setSelectedLogTagIds([]);
                            setSelectedRecordTagIds([]);
                          }}
                        >
                          <Text className="text-destructive">
                            Clear filters
                          </Text>
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}
            </View>
          </View>
        }
      />
    </Page>
  );
}
