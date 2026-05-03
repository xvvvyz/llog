import { ResultItem } from '@/features/search/components/result-item';
import { useSearch } from '@/features/search/hooks/use-search';
import { SearchResult } from '@/features/search/types/search';
import { cn } from '@/lib/cn';
import { Header } from '@/ui/header';
import { List, type ListHandle } from '@/ui/list';
import { Page } from '@/ui/page';
import { SearchInput } from '@/ui/search-input';
import * as React from 'react';
import { View } from 'react-native';

export default function Search() {
  const [query, setQuery] = React.useState('');
  const trimmedQuery = query.trim();
  const { results } = useSearch({ query });
  const listRef = React.useRef<ListHandle | null>(null);

  React.useEffect(() => {
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
      <Header title="Search" />
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
