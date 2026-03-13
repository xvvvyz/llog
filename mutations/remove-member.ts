import { db } from '@/utilities/db';

export const removeMember = async ({ id }: { id: string }) => {
  return db.transact(db.tx.roles[id].delete());
};
