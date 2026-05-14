import * as reactionDomain from '@/domain/records/reactions';
import { resolveProfileAndTeam } from '@/features/account/queries/resolve-profile-and-team';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';

export const toggleReaction = async ({
  emoji,
  existingReactionId,
  logId,
  profileId,
  teamId,
  recordId,
  replyId,
}: {
  emoji: reactionDomain.ReactionEmoji;
  existingReactionId?: string;
  logId?: string;
  profileId?: string;
  teamId: string;
  recordId: string;
  replyId?: string;
}) => {
  if (existingReactionId) {
    return db.transact(db.tx.reactions[existingReactionId].delete());
  }

  const resolved = await resolveProfileAndTeam(profileId, teamId);
  if (!resolved) return;

  if (logId) {
    return db.transact(
      reactionDomain.buildAddReactionTransactions({
        activityId: id(),
        db,
        emoji,
        logId,
        now: new Date().toISOString(),
        profileId: resolved.profileId,
        reactionId: id(),
        recordId,
        replyId,
        teamId: resolved.teamId,
      })
    );
  }

  return db.transact(
    reactionDomain.buildAddReactionTransactions({
      db,
      emoji,
      profileId: resolved.profileId,
      reactionId: id(),
      recordId,
      replyId,
      teamId: resolved.teamId,
    })
  );
};
