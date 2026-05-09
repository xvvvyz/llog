import { recordDraftQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { useLog } from '@/features/logs/queries/use-log';
import { createRecordDraft } from '@/features/records/mutations/create-record-draft';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

export const useRecordDraft = ({
  ignoredDraftIds,
  logId,
}: {
  ignoredDraftIds?: ReadonlySet<string>;
  logId?: string;
}) => {
  const profile = useProfile();
  const log = useLog({ id: logId });

  const { data, isLoading } = db.useQuery(
    logId && profile.id
      ? {
          records: {
            $: { where: { author: profile.id, log: logId, isDraft: true } },
            ...recordDraftQuery,
          },
        }
      : null
  );

  const queryKey = logId && profile.id ? `${profile.id}:${logId}` : undefined;
  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const records = queryKey && hasCurrentResult ? (data?.records ?? []) : [];

  const record = records.find(
    (item) =>
      item.id && item.log?.id === logId && !ignoredDraftIds?.has(item.id)
  );

  const hasStaleResult =
    !!logId && hasCurrentResult && records.length > 0 && !record;

  const draftIsLoading =
    !!queryKey && (isLoading || !hasCurrentResult || hasStaleResult);

  React.useEffect(() => {
    if (draftIsLoading || log.isLoading || record || !log.teamId) return;
    createRecordDraft({ logId, profileId: profile.id, teamId: log.teamId });
  }, [draftIsLoading, log.isLoading, log.teamId, logId, record, profile.id]);

  const files = record?.files ?? [];
  const links = record?.links ?? [];
  return { ...record, links, files, isLoading: draftIsLoading };
};
