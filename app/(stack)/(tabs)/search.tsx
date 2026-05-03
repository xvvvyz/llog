import { ResultItem } from '@/features/search/components/result-item';
import { useSearch } from '@/features/search/hooks/use-search';
import { SearchResult } from '@/features/search/types/search';
import { cn } from '@/lib/cn';
import { Header } from '@/ui/header';
import { List } from '@/ui/list';
import { Page } from '@/ui/page';
import { SearchInput } from '@/ui/search-input';
import * as React from 'react';
import { View } from 'react-native';

export default function Search() {
  const [query, setQuery] = React.useState('');
  const { results } = useSearch({ query });

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
          <View className="pb-3">
            <SearchInput
              query={query}
              setQuery={setQuery}
              wrapperClassName="w-full"
            />
          </View>
        }
      />
    </Page>
  );
}
