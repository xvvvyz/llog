import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const toggleReaction = async ({
  emoji,
  recordId,
  commentId,
}: {
  emoji: string;
  recordId?: string;
  commentId?: string;
}) => {
  const profile = await getProfile();
  if (!profile) return;

  const { data } = await db.queryOnce({
    reactions: {
      $: {
        where: {
          emoji,
          author: profile.id,
          ...(recordId ? { record: recordId } : { comment: commentId }),
        },
      },
    },
  });

  const existing = data?.reactions?.[0];

  if (existing) {
    return db.transact(db.tx.reactions[existing.id].delete());
  }

  const link: { author: string; record?: string; comment?: string } = {
    author: profile.id,
  };

  if (recordId) link.record = recordId;
  if (commentId) link.comment = commentId;

  return db.transact(db.tx.reactions[id()].update({ emoji }).link(link));
};
