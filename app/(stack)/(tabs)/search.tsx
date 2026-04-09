import { SearchResultItem } from '@/components/search-result-item';
import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Page } from '@/components/ui/page';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSearch } from '@/hooks/use-search';
import { useLogTags } from '@/queries/use-log-tags';
import { useLogs } from '@/queries/use-logs';
import { SPECTRUM } from '@/theme/spectrum';
import { SearchResult } from '@/types/search';
import { cn } from '@/utilities/cn';
import { Funnel, MagnifyingGlass } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

export default function Search() {
  const [query, setQuery] = useState('');
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const colorScheme = useColorScheme();
  const logs = useLogs();
  const logTags = useLogTags();

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

  const logIdSet = useMemo(() => new Set(selectedLogIds), [selectedLogIds]);
  const tagIdSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const hasFilters = selectedLogIds.length > 0 || selectedTagIds.length > 0;

  const renderItem = useCallback(
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
              {(!!logs.data.length || !!logTags.data.length) && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      size="icon"
                      variant={hasFilters ? 'default' : 'secondary'}
                    >
                      <Icon
                        className={
                          hasFilters
                            ? 'text-primary-foreground'
                            : 'text-secondary-foreground'
                        }
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
                    {!!logTags.data.length && (
                      <>
                        {!!logs.data.length && <DropdownMenu.Separator />}
                        <DropdownMenu.Label>Tags</DropdownMenu.Label>
                        {logTags.data.map((tag) => (
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
        keyboardShouldPersistTaps="always"
        ListEmptyComponent={
          query.trim() ? (
            <View className="items-center justify-center gap-4 py-16">
              <Icon
                className="text-muted-foreground"
                icon={MagnifyingGlass}
                size={48}
              />
              <Text className="text-muted-foreground">No results found</Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </Page>
  );
}
