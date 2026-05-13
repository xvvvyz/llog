import { ResultItem } from '@/features/search/components/result-item';
import { useSearch } from '@/features/search/hooks/use-search';
import { SearchResult } from '@/features/search/types/search';
import { cn } from '@/lib/cn';
import { Header } from '@/ui/header';
import { List, type ListHandle } from '@/ui/list';
import { Page } from '@/ui/page';
import { SearchInput } from '@/ui/search-input';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

export const SearchPage = ({ left }: { left?: React.ReactNode }) => {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const paramQuery = getParamValue(params.q);
  const [query, setQuery] = React.useState(paramQuery);
  const trimmedQuery = query.trim();
  const { isLoading, results } = useSearch({ query });
  const listRef = React.useRef<ListHandle | null>(null);
  const previousTrimmedQueryRef = React.useRef(trimmedQuery);

  React.useEffect(() => {
    setQuery(paramQuery);
  }, [paramQuery]);

  React.useEffect(() => {
    if (previousTrimmedQueryRef.current === trimmedQuery) return;
    previousTrimmedQueryRef.current = trimmedQuery;
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [trimmedQuery]);

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
      <Header left={left} title="Search" />
      <List
        contentContainerClassName="mx-auto w-full max-w-lg px-4 pt-4 md:pt-8"
        data={trimmedQuery ? results : []}
        estimatedItemSize={100}
        extraData={trimmedQuery}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => `${item.type}:${item.id}`}
        listRef={listRef}
        maintainVisibleContentPosition={false}
        renderItem={renderItem}
        ListHeaderComponent={
          <View className="pb-3">
            <SearchInput
              isLoading={isLoading}
              query={query}
              setQuery={setQuery}
              wrapperClassName="w-full"
            />
          </View>
        }
      />
    </Page>
  );
};
