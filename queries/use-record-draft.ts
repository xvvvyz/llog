import { createRecordDraft } from '@/mutations/create-record-draft';
import { useProfile } from '@/queries/use-profile';
import { db } from '@/utilities/db';
import { useEffect } from 'react';

export const useRecordDraft = ({ logId }: { logId?: string }) => {
  const profile = useProfile();

  const { data, isLoading } = db.useQuery(
    logId && profile.id
      ? {
          records: {
            $: { where: { author: profile.id, log: logId, isDraft: true } },
            images: {},
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const record = data?.records?.[0];

  useEffect(() => {
    if (isLoading || record) return;
    createRecordDraft({ logId });
  }, [isLoading, logId, record]);

  const images = record?.images ?? [];
  return { ...record, images, isLoading };
};
