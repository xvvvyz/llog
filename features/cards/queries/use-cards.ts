import { recordTagsQuery } from '@/domain/tags/query';
import type { LogCard } from '@/features/cards/types/card';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const cardFields = [
  'error' as const,
  'generationRequestedAt' as const,
  'id' as const,
  'isGenerating' as const,
  'lastGeneratedAt' as const,
  'logId' as const,
  'order' as const,
  'output' as const,
  'prompt' as const,
  'teamId' as const,
  'title' as const,
  'type' as const,
];

export const useLogCards = ({
  enabled = true,
  logId,
}: {
  enabled?: boolean;
  logId?: string;
}) => {
  const queryKey = enabled && logId ? logId : undefined;

  const { data, isLoading } = db.useQuery(
    queryKey
      ? {
          cards: {
            $: {
              fields: cardFields,
              order: { order: 'asc' },
              where: { logId: queryKey },
            },
            tags: recordTagsQuery,
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  const cards =
    queryKey && hasCurrentResult ? ((data?.cards ?? []) as LogCard[]) : [];

  return {
    data: cards,
    isLoading: !!queryKey && (isLoading || !hasCurrentResult),
  };
};

export const useLogCard = ({
  enabled = true,
  id,
}: {
  enabled?: boolean;
  id?: string;
}) => {
  const queryKey = enabled && id ? id : undefined;

  const { data, isLoading } = db.useQuery(
    queryKey
      ? {
          cards: {
            $: { fields: cardFields, where: { id: queryKey } },
            tags: recordTagsQuery,
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  const cards =
    queryKey && hasCurrentResult ? ((data?.cards ?? []) as LogCard[]) : [];

  const card = cards.find((item) => item.id === queryKey) as
    | LogCard
    | undefined;

  const hasStaleResult =
    !!queryKey && hasCurrentResult && cards.length > 0 && !card;

  return {
    ...card,
    isLoading: !!queryKey && (isLoading || !hasCurrentResult || hasStaleResult),
  };
};
