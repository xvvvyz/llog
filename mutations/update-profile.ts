import { db } from '@/utilities/db';

export const updateProfile = async ({
  id,
  name,
}: {
  id?: string;
  name?: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.profiles[id].update({ name }));
};
