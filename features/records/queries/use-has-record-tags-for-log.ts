import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useHasRecordTagsForLog = ({
  enabled = true,
  logId,
  teamId,
}: {
  enabled?: boolean;
  logId?: string;
  teamId?: string;
}) => {
  const { data, isLoading } = db.useQuery(
    enabled && logId && teamId
      ? {
          tags: {
            $: {
              fields: ['id'],
              limit: 1,
              where: { logs: logId, team: teamId, type: 'record' },
            },
          },
        }
      : null
  );

  const queryKey =
    enabled && logId && teamId ? `${teamId}:${logId}` : undefined;

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  return {
    hasRecordTags: !!queryKey && hasCurrentResult && !!data?.tags?.length,
    isLoading: !!queryKey && (isLoading || !hasCurrentResult),
  };
};
