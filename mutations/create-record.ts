import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/ui/db';
import { id } from '@instantdb/react-native';

export const createRecord = async ({
  logId,
  text,
}: {
  logId: string;
  text: string;
}) => {
  const profile = await getProfile();
  if (!profile) return;

  await db.transact(
    db.tx.records[id()]
      .update({ date: new Date().toISOString(), text })
      .link({ author: profile.id, log: logId })
  );
};
