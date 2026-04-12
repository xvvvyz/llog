import { resolveProfileAndTeam } from '@/queries/resolve-profile-and-team';
import { db } from '@/utilities/db';

export const createCommentDraft = async ({
  commentId,
  recordId,
  profileId,
  teamId,
}: {
  commentId: string;
  recordId?: string;
  profileId?: string;
  teamId: string;
}) => {
  if (!recordId) return;

  const resolved = await resolveProfileAndTeam(profileId, teamId);
  if (!resolved) return;

  return db.transact(
    db.tx.comments[commentId]
      .update({
        date: new Date().toISOString(),
        isDraft: true,
        teamId: resolved.teamId,
        text: '',
      })
      .link({ author: resolved.profileId, record: recordId })
  );
};
