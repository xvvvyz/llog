import * as cardSourceSelection from '@/domain/cards/source-selection';
import { publishedContentWhere } from '@/domain/records/query';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

export const useHasCardSourceRecords = ({
  enabled = true,
  logId,
  tagIds,
}: {
  enabled?: boolean;
  logId?: string;
  tagIds: ReadonlySet<string>;
}) => {
  const normalizedTagIds = React.useMemo(
    () => cardSourceSelection.uniqueCardTagIds(tagIds),
    [tagIds]
  );

  const tagKey = normalizedTagIds.join('\u0000');

  const queryKey =
    enabled && logId && normalizedTagIds.length > 0
      ? `${logId}\u0000${tagKey}`
      : undefined;

  const { data, isLoading } = db.useQuery(
    queryKey
      ? {
          records: {
            $: {
              fields: ['id' as const],
              limit: 1,
              order: { date: 'asc' as const },
              where: {
                ...publishedContentWhere,
                'tags.id': { $in: normalizedTagIds },
                logId,
                text: { $not: '' },
              },
            },
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  const records = React.useMemo(
    () => (queryKey && hasCurrentResult ? (data?.records ?? []) : []),
    [data?.records, hasCurrentResult, queryKey]
  );

  const hasSourceRecords = records.length > 0;

  return {
    hasSourceRecords,
    isLoading: !!queryKey && (isLoading || !hasCurrentResult),
  };
};
