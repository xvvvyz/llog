import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const publishComment = async ({
  id: commentId,
  text,
  logId,
  profileId,
  recordId,
  teamId,
}: {
  id?: string;
  text: string;
  logId?: string;
  profileId?: string;
  recordId?: string;
  teamId?: string;
}) => {
  if (!commentId) return;
  const now = new Date().toISOString();

  if (logId && profileId && recordId && teamId) {
    return db.transact([
      db.tx.comments[commentId].update({ date: now, isDraft: false, text }),
      db.tx.activities[id()]
        .update({
          type: 'comment_posted',
          date: now,
          teamId,
        })
        .link({
          actor: profileId,
          team: teamId,
          record: recordId,
          comment: commentId,
          log: logId,
        }),
    ]);
  }

  return db.transact(
    db.tx.comments[commentId].update({ date: now, isDraft: false, text })
  );
};
