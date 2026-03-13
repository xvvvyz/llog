import { Role } from '@/enums/roles';
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
      adminId: role !== Role.Recorder ? userId : '',
      key: `${role}_${userId}_${teamId}`,
      role,
      teamId,
      userId,
    })
  );
};
