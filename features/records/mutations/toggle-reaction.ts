import { db } from '@/lib/db';
import { resolveProfileAndTeam } from '@/queries/resolve-profile-and-team';
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
  emoji: string;
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

  const reactionLink: { author: string; record?: string; reply?: string } = {
    author: resolved.profileId,
  };

  if (replyId) {
    reactionLink.reply = replyId;
  } else {
    reactionLink.record = recordId;
  }

  if (logId) {
    const reactionId = id();
    const activityId = id();

    const activityLink: Record<string, string> = {
      actor: resolved.profileId,
      team: resolved.teamId,
      record: recordId,
      log: logId,
    };

    if (replyId) activityLink.reply = replyId;

    return db.transact([
      db.tx.reactions[reactionId]
        .update({ emoji, teamId: resolved.teamId })
        .link({ ...reactionLink, activity: activityId }),
      db.tx.activities[activityId]
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
