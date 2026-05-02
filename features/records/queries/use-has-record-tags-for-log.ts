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

  return { hasRecordTags: !!data?.tags?.length, isLoading };
};
