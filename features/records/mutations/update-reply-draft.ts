import { db } from '@/lib/db';

export const updateReplyDraft = async ({
  authorId,
  date,
  id,
  recordId,
  teamId,
  text,
}: {
  authorId?: string;
  date?: string | number;
  id?: string;
  recordId?: string;
  teamId?: string;
  text: string;
}) => {
  if (!id) return;

  const requiredDraftFields =
    authorId && recordId && teamId ? { authorId, recordId, teamId } : undefined;

  const replyUpdate = {
    ...(requiredDraftFields
      ? {
          date: date ?? new Date().toISOString(),
          isDraft: true,
          teamId: requiredDraftFields.teamId,
        }
      : {}),
    text,
  };

  const replyTx = db.tx.replies[id].update(
    replyUpdate,
    requiredDraftFields ? { upsert: true } : { upsert: false }
  );

  return db.transact(
    requiredDraftFields
      ? replyTx.link({
          author: requiredDraftFields.authorId,
          record: requiredDraftFields.recordId,
        })
      : replyTx
  );
};
