import { useProfile } from '@/features/account/queries/use-profile';
import { useLog } from '@/features/logs/queries/use-log';
import { createRecordDraft } from '@/features/records/mutations/create-record-draft';
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
            media: {},
            links: {},
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const records = data?.records ?? [];

  const record = records.find(
    (item) =>
      item.id && item.log?.id === logId && !ignoredDraftIds?.has(item.id)
  );

  const hasStaleResult = !!logId && records.length > 0 && !record;
  const draftIsLoading = isLoading || hasStaleResult;

  React.useEffect(() => {
    if (draftIsLoading || log.isLoading || record || !log.teamId) return;
    createRecordDraft({ logId, profileId: profile.id, teamId: log.teamId });
  }, [draftIsLoading, log.isLoading, log.teamId, logId, record, profile.id]);

  const media = record?.media ?? [];
  const links = record?.links ?? [];
  return { ...record, links, media, isLoading: draftIsLoading };
};
