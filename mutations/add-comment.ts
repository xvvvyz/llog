import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/ui/db';
import { id } from '@instantdb/react-native';

export const addComment = async ({
  recordId,
  text,
}: {
  recordId: string;
  text: string;
}) => {
  const profile = await getProfile();
  if (!profile) return;

  return db.transact(
    db.tx.comments[id()]
      .update({ date: new Date().toISOString(), text })
      .link({ author: profile.id, record: recordId })
  );
};
