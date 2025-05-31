import { Role } from '@/enums/roles';
import { db } from '@/utilities/db';
import { id as generateId } from '@instantdb/react-native';

export const onboardUser = async ({
  id,
  name,
}: {
  id?: string;
  name: string;
}) => {
  if (!id) return;
  const roleId = generateId();
  const teamId = generateId();

  return db.transact([
    db.tx.profiles[id].update({ name }).link({ user: id }),
    db.tx.teams[teamId].update({ name }),
    db.tx.roles[roleId]
      .update({ role: Role.Owner })
      .link({ team: teamId, user: id }),
    db.tx.ui[id].update({}).link({ team: teamId, user: id }),
  ]);
};
