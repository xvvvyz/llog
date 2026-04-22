import { db } from '@/lib/db';
import { Role } from '@/types/role';
import { id as generateId } from '@instantdb/react-native';

export const onboardUser = async ({ name }: { name: string }) => {
  const auth = await db.getAuth();
  if (!auth) return;
  const teamId = generateId();
  const now = new Date().toISOString();

  return db.transact([
    db.tx.profiles[generateId()].update({ name }).link({ user: auth.id }),
    db.tx.teams[teamId].update({ name }),
    db.tx.roles[generateId()]
      .update({
        key: `${Role.Owner}_${auth.id}_${teamId}`,
        role: Role.Owner,
        teamId,
        userId: auth.id,
      })
      .link({ team: teamId, user: auth.id }),
    db.tx.ui[generateId()]
      .update({ activityLastReadDate: now })
      .link({ team: teamId, user: auth.id }),
  ]);
};
