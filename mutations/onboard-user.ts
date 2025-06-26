import { Role } from '@/enums/roles';
import { db } from '@/utilities/db';
import { id as generateId } from '@instantdb/react-native';

export const onboardUser = async ({ name }: { name: string }) => {
  const auth = await db.getAuth();
  if (!auth) return;
  const teamId = generateId();

  return db.transact([
    db.tx.profiles[generateId()].update({ name }).link({ user: auth.id }),
    db.tx.teams[teamId].update({ name }),
    db.tx.roles[generateId()]
      .update({
        key: `${Role.Owner}_${auth.id}`,
        role: Role.Owner,
        userId: auth.id,
      })
      .link({ team: teamId, user: auth.id }),
    db.tx.ui[generateId()].update({}).link({ team: teamId, user: auth.id }),
  ]);
};
