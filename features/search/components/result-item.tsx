import { openRecordDetail } from '@/features/records/lib/route';
import { ResultLogCard } from '@/features/search/components/result-log-card';
import { ResultRecordCard } from '@/features/search/components/result-record-card';
import { SearchResult } from '@/features/search/types/search';
import { router } from 'expo-router';
import * as React from 'react';

export const ResultItem = ({
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
        openRecordDetail(result.id);
        break;
      }
      case 'reply': {
        openRecordDetail(result.recordId);
        break;
      }
    }
  }, [result.id, result.recordId, result.type]);

  if (result.type === 'log') {
    return (
      <ResultLogCard
        className={className}
        onPress={handlePress}
        result={result}
      />
    );
  }

  return (
    <ResultRecordCard
      className={className}
      onPress={handlePress}
      result={result}
    />
  );
};
