import { getActiveTeamId } from '@/queries/get-active-team-id';
import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/db';

export const createCommentDraft = async ({
  commentId,
  recordId,
}: {
  commentId: string;
  recordId?: string;
}) => {
  if (!recordId) return;

  const [profile, teamId] = await Promise.all([
    getProfile(),
    getActiveTeamId(),
  ]);

  if (!profile || !teamId) return;

  return db.transact(
    db.tx.comments[commentId]
      .update({
        date: new Date().toISOString(),
        isDraft: true,
        teamId,
        text: '',
      })
      .link({ author: profile.id, record: recordId })
  );
};
