import { db } from '@/utilities/db';

export const deleteTeam = async ({ id }: { id?: string }) => {
  if (!id) return;
  return db.transact(db.tx.teams[id].delete());
};
