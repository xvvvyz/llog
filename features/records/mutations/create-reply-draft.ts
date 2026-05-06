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

  const { data } = await db.queryOnce({
    replies: {
      $: {
        fields: ['id'],
        where: { author: resolved.profileId, record: recordId, isDraft: true },
      },
    },
  });

  if (data.replies?.[0]) return;

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
