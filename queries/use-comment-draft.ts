import { createCommentDraft } from '@/mutations/create-comment-draft';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import { useEffect, useRef } from 'react';

export const useCommentDraft = ({ recordId }: { recordId?: string }) => {
  const profile = useProfile();
  const ui = useUi();
  const commentIdRef = useRef(id());

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

  useEffect(() => {
    if (isLoading || comment) return;
    commentIdRef.current = id();

    createCommentDraft({
      commentId: commentIdRef.current,
      recordId,
      profileId: profile.id,
      teamId: ui.activeTeamId,
    });
  }, [isLoading, recordId, comment, profile.id, ui.activeTeamId]);

  const media = comment?.media ?? [];
  return { ...comment, media, isLoading };
};
