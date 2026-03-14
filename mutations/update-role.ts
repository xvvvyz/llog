import { db } from '@/utilities/db';

export const updateRole = async ({
  id,
  role,
  teamId,
  userId,
}: {
  id: string;
  role: string;
  teamId: string;
  userId: string;
}) => {
  return db.transact(
    db.tx.roles[id].update({
      key: `${role}_${userId}_${teamId}`,
      role,
      teamId,
      userId,
    })
  );
};
