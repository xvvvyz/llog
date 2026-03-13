import { db } from '@/utilities/db';

export const cancelInvite = async ({ id }: { id: string }) => {
  return db.transact(db.tx.invites[id].delete());
};
