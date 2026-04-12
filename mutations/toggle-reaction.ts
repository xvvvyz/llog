import { resolveProfileAndTeam } from '@/queries/resolve-profile-and-team';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const toggleReaction = async ({
  emoji,
  existingReactionId,
  logId,
  profileId,
  teamId,
  recordId,
  commentId,
}: {
  emoji: string;
  existingReactionId?: string;
  logId?: string;
  profileId?: string;
  teamId: string;
  recordId: string;
  commentId?: string;
}) => {
  if (existingReactionId) {
    return db.transact(db.tx.reactions[existingReactionId].delete());
  }

  const resolved = await resolveProfileAndTeam(profileId, teamId);
  if (!resolved) return;

  const reactionLink: { author: string; record?: string; comment?: string } = {
    author: resolved.profileId,
  };

  if (commentId) {
    reactionLink.comment = commentId;
  } else {
    reactionLink.record = recordId;
  }

  if (logId) {
    const activityLink: Record<string, string> = {
      actor: resolved.profileId,
      team: resolved.teamId,
      record: recordId,
      log: logId,
    };

    if (commentId) activityLink.comment = commentId;

    return db.transact([
      db.tx.reactions[id()]
        .update({ emoji, teamId: resolved.teamId })
        .link(reactionLink),
      db.tx.activities[id()]
        .update({
          type: 'reaction_added',
          date: new Date().toISOString(),
          teamId: resolved.teamId,
          emoji,
        })
        .link(activityLink),
    ]);
  }

  return db.transact(
    db.tx.reactions[id()]
      .update({ emoji, teamId: resolved.teamId })
      .link(reactionLink)
  );
};
