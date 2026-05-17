import { db } from '@/lib/db';

export const deleteInviteLink = async ({ id }: { id: string }) => {
  await db.transact(db.tx.invites[id].delete());
};
