import { db } from '@/lib/db';
import { getUi } from '@/queries/get-ui';
import { Role } from '@/types/role';
import { id as generateId } from '@instantdb/react-native';

export const createTeam = async ({ name }: { name: string }) => {
  const auth = await db.getAuth();
  if (!auth) return;

  const ui = await getUi();
  if (!ui) return;

  const teamId = generateId();

  await db.transact([
    db.tx.teams[teamId].update({ name }),
    db.tx.roles[generateId()]
      .update({
        key: `${Role.Owner}_${auth.id}_${teamId}`,
        role: Role.Owner,
        teamId,
        userId: auth.id,
      })
      .link({ team: teamId, user: auth.id }),
    db.tx.ui[ui.id].link({ team: teamId }),
  ]);

  return teamId;
};
