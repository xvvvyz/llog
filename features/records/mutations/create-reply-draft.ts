import { resolveProfileAndTeam } from '@/features/account/queries/resolve-profile-and-team';
import { db } from '@/lib/db';

export const createReplyDraft = async ({
  replyId,
  recordId,
  profileId,
  teamId,
}: {
  replyId: string;
  recordId?: string;
  profileId?: string;
  teamId: string;
}) => {
  if (!recordId) return;
  const resolved = await resolveProfileAndTeam(profileId, teamId);
  if (!resolved) return;

  await db.transact(
    db.tx.replies[replyId]
      .update(
        {
          date: new Date().toISOString(),
          isDraft: true,
          teamId: resolved.teamId,
          text: '',
        },
        { upsert: true }
      )
      .link({ author: resolved.profileId, record: recordId })
  );

  return replyId;
};
