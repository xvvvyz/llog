import { Role } from '@/domain/teams/role';
import { getUi } from '@/features/account/queries/get-ui';
import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

export const createTeam = async ({ name }: { name: string }) => {
  const auth = await db.getAuth();
  if (!auth) return;
  const ui = await getUi();
  if (!ui) return;
  const teamId = generateId();
  const trimmedName = name.trim();

  await db.transact([
    db.tx.teams[teamId].update({ name: trimmedName }),
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
