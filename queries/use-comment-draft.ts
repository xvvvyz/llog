import { createCommentDraft } from '@/mutations/create-comment-draft';
import { useProfile } from '@/queries/use-profile';
import { useRecord } from '@/queries/use-record';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useCommentDraft = ({ recordId }: { recordId?: string }) => {
  const profile = useProfile();
  const record = useRecord({ id: recordId });
  const commentIdRef = React.useRef(id());

  const { data, isLoading } = db.useQuery(
    recordId && profile.id
      ? {
          comments: {
            $: {
              where: { author: profile.id, record: recordId, isDraft: true },
            },
            media: {},
          },
        }
      : null
  );

  const comment = data?.comments?.[0];

  React.useEffect(() => {
    if (isLoading || record.isLoading || comment || !record.teamId) return;
    commentIdRef.current = id();

    createCommentDraft({
      commentId: commentIdRef.current,
      recordId,
      profileId: profile.id,
      teamId: record.teamId,
    });
  }, [
    isLoading,
    record.isLoading,
    record.teamId,
    recordId,
    comment,
    profile.id,
  ]);

  const media = comment?.media ?? [];
  return { ...comment, media, isLoading };
};
