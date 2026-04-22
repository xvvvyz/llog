import { useTags } from '@/features/logs/queries/use-log-tags';
import { useLogs } from '@/features/logs/queries/use-logs';
import { SearchResultItem } from '@/features/search/components/search-result-item';
import { useSearch } from '@/features/search/hooks/use-search';
import { SearchResult } from '@/features/search/types/search';
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
import { Funnel } from 'phosphor-react-native/lib/module/icons/Funnel';
import * as React from 'react';
import { View } from 'react-native';

export default function Search() {
  const [query, setQuery] = React.useState('');
  const [selectedLogIds, setSelectedLogIds] = React.useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const colorScheme = useColorScheme();
  const { teams } = useTeams();
  const teamIds = React.useMemo(() => teams.map((team) => team.id), [teams]);
  const logs = useLogs({ teamIds });
  const tags = useTags({ teamIds });

  const { results } = useSearch({
    query,
    logIds: selectedLogIds.length ? selectedLogIds : undefined,
    tagIds: selectedTagIds.length ? selectedTagIds : undefined,
  });

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
      setter((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );

  const toggleLogId = toggle(setSelectedLogIds);
  const toggleTagId = toggle(setSelectedTagIds);

  const logIdSet = React.useMemo(
    () => new Set(selectedLogIds),
    [selectedLogIds]
  );

  const tagIdSet = React.useMemo(
    () => new Set(selectedTagIds),
    [selectedTagIds]
  );

  const hasFilters = selectedLogIds.length > 0 || selectedTagIds.length > 0;

  const renderItem = React.useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => (
      <SearchResultItem
        className={cn(
          'mt-3',
          index === 0 && 'md:mt-0',
          index === results.length - 1 && 'mb-4 md:mb-8'
        )}
        result={item}
      />
    ),
    [results.length]
  );

  return (
    <Page>
      <Header title="Search" />
      <List
        ListHeaderComponent={
          <View className="gap-3 pb-3">
            <View className="flex-row gap-3">
              <SearchInput
                query={query}
                setQuery={setQuery}
                wrapperClassName="flex-1"
              />
              {(!!logs.data.length || !!tags.data.length) && (
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
                              checked={logIdSet.has(log.id)}
                              key={log.id}
                              onCheckedChange={() => toggleLogId(log.id)}
                            >
                              <View
                                className="size-3 rounded-[2px]"
                                style={{
                                  backgroundColor: color?.default,
                                }}
                              />
                              <Text>{log.name}</Text>
                            </DropdownMenu.CheckboxItem>
                          );
                        })}
                      </>
                    )}
                    {!!tags.data.length && (
                      <>
                        {!!logs.data.length && <DropdownMenu.Separator />}
                        <DropdownMenu.Label>Tags</DropdownMenu.Label>
                        {tags.data.map((tag) => (
                          <DropdownMenu.CheckboxItem
                            checked={tagIdSet.has(tag.id)}
                            key={tag.id}
                            onCheckedChange={() => toggleTagId(tag.id)}
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
                            setSelectedTagIds([]);
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
        contentContainerClassName="mx-auto w-full max-w-lg px-4 pt-4 md:pt-8"
        data={query.trim() ? results : []}
        estimatedItemSize={100}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
      />
    </Page>
  );
}
