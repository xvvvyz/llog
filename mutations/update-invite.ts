import { db } from '@/utilities/db';

export const updateInvite = async ({
  id,
  role,
}: {
  id: string;
  role: string;
}) => {
  return db.transact(db.tx.invites[id].update({ role }));
};
