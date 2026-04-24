import { db } from '@/lib/db';
import { resolveProfileAndTeam } from '@/queries/resolve-profile-and-team';

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

  return db.transact(
    db.tx.replies[replyId]
      .update({
        date: new Date().toISOString(),
        isDraft: true,
        teamId: resolved.teamId,
        text: '',
      })
      .link({ author: resolved.profileId, record: recordId })
  );
};
