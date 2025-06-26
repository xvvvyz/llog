import { getProfile } from '@/queries/get-profile';
import { hasRecordDraft } from '@/queries/has-record-draft';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const createRecordDraft = async ({ logId }: { logId?: string }) => {
  if (!logId) return;

  const [profile, hasDraft] = await Promise.all([
    getProfile(),
    hasRecordDraft({ logId }),
  ]);

  if (!profile || hasDraft) return;

  return db.transact(
    db.tx.records[id()]
      .update({ date: new Date().toISOString(), isDraft: true })
      .link({ author: profile.id, log: logId })
  );
};
