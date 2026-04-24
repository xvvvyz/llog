import { SearchResultLogCard } from '@/features/search/components/search-result-log-card';
import { SearchResultRecordCard } from '@/features/search/components/search-result-record-card';
import { SearchResult } from '@/features/search/types/search';
import { router } from 'expo-router';
import * as React from 'react';

export const SearchResultItem = ({
  className,
  result,
}: {
  className?: string;
  result: SearchResult;
}) => {
  const handlePress = React.useCallback(() => {
    switch (result.type) {
      case 'log': {
        router.push(`/${result.id}`);
        break;
      }
      case 'record': {
        router.setParams({ recordId: result.id });
        break;
      }
      case 'reply': {
        if (result.recordId) router.setParams({ recordId: result.recordId });
        break;
      }
    }
  }, [result.id, result.recordId, result.type]);

  if (result.type === 'log') {
    return (
      <SearchResultLogCard
        className={className}
        onPress={handlePress}
        result={result}
      />
    );
  }

  return (
    <SearchResultRecordCard
      className={className}
      onPress={handlePress}
      result={result}
    />
  );
};
