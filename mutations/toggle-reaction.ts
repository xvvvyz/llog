import { resolveProfileAndTeam } from '@/queries/resolve-profile-and-team';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const toggleReaction = async ({
  emoji,
  existingReactionId,
  profileId,
  teamId,
  recordId,
  commentId,
}: {
  emoji: string;
  existingReactionId?: string;
  profileId?: string;
  teamId?: string;
  recordId: string;
  commentId?: string;
}) => {
  if (existingReactionId) {
    return db.transact(db.tx.reactions[existingReactionId].delete());
  }

  const resolved = await resolveProfileAndTeam(profileId, teamId);
  if (!resolved) return;

  const link: { author: string; record?: string; comment?: string } = {
    author: resolved.profileId,
  };

  if (commentId) {
    link.comment = commentId;
  } else {
    link.record = recordId;
  }

  return db.transact(
    db.tx.reactions[id()].update({ emoji, teamId: resolved.teamId }).link(link)
  );
};
