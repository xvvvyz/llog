import { useProfile } from '@/features/account/queries/use-profile';
import { useLog } from '@/features/logs/queries/use-log';
import { createRecordDraft } from '@/features/records/mutations/create-record-draft';
import { db } from '@/lib/db';
import * as React from 'react';

export const useRecordDraft = ({ logId }: { logId?: string }) => {
  const profile = useProfile();
  const log = useLog({ id: logId });

  const { data, isLoading } = db.useQuery(
    logId && profile.id
      ? {
          records: {
            $: { where: { author: profile.id, log: logId, isDraft: true } },
            media: {},
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const record = data?.records?.[0];

  React.useEffect(() => {
    if (isLoading || log.isLoading || record || !log.teamId) return;

    createRecordDraft({
      logId,
      profileId: profile.id,
      teamId: log.teamId,
    });
  }, [isLoading, log.isLoading, log.teamId, logId, record, profile.id]);

  const media = record?.media ?? [];
  return { ...record, media, isLoading };
};
