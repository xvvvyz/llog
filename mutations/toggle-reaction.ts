import { getActiveTeamId } from '@/queries/get-active-team-id';
import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const toggleReaction = async ({
  emoji,
  recordId,
  commentId,
}: {
  emoji: string;
  recordId: string;
  commentId?: string;
}) => {
  const [profile, teamId] = await Promise.all([
    getProfile(),
    getActiveTeamId(),
  ]);

  if (!profile || !teamId) return;

  const { data } = await db.queryOnce({
    reactions: {
      $: {
        where: {
          emoji,
          author: profile.id,
          ...(commentId ? { comment: commentId } : { record: recordId }),
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

  if (commentId) {
    link.comment = commentId;
  } else {
    link.record = recordId;
  }

  return db.transact(
    db.tx.reactions[id()].update({ emoji, teamId }).link(link)
  );
};
