import { createRecordDraft } from '@/mutations/create-record-draft';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { useEffect } from 'react';

export const useRecordDraft = ({ logId }: { logId?: string }) => {
  const profile = useProfile();
  const ui = useUi();

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

  useEffect(() => {
    if (isLoading || record) return;

    createRecordDraft({
      logId,
      profileId: profile.id,
      teamId: ui.activeTeamId,
    });
  }, [isLoading, logId, record, profile.id, ui.activeTeamId]);

  const media = record?.media ?? [];
  return { ...record, media, isLoading };
};
