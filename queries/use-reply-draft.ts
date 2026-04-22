import { db } from '@/lib/db';
import { createReplyDraft } from '@/mutations/create-reply-draft';
import { useProfile } from '@/queries/use-profile';
import { useRecord } from '@/queries/use-record';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useReplyDraft = ({ recordId }: { recordId?: string }) => {
  const profile = useProfile();
  const record = useRecord({ id: recordId });
  const replyIdRef = React.useRef(id());

  const { data, isLoading } = db.useQuery(
    recordId && profile.id
      ? {
          replies: {
            $: {
              where: { author: profile.id, record: recordId, isDraft: true },
            },
            media: {},
          },
        }
      : null
  );

  const reply = data?.replies?.[0];

  React.useEffect(() => {
    if (isLoading || record.isLoading || reply || !record.teamId) return;
    replyIdRef.current = id();

    createReplyDraft({
      replyId: replyIdRef.current,
      recordId,
      profileId: profile.id,
      teamId: record.teamId,
    });
  }, [isLoading, record.isLoading, record.teamId, recordId, reply, profile.id]);

  const media = reply?.media ?? [];
  return { ...reply, media, isLoading };
};
