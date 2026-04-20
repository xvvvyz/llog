import { db } from '@/utilities/db';

export const updateProfile = async ({
  id,
  name,
}: {
  id: string;
  name?: string;
}) => {
  return db.transact(db.tx.profiles[id].update({ name }));
};
