import { db } from '@/lib/db';
import * as permissions from '@/lib/permissions';
import { getActiveTeamId } from '@/queries/get-active-team-id';
import { Color } from '@/theme/spectrum';
import { id as generateId } from '@instantdb/react-native';

export const createLog = async ({
  color,
  id,
  name,
}: {
  color: Color;
  id?: string;
  name: string;
}) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  const { data } = await db.queryOnce({
    roles: {
      $: { where: { team: teamId } },
      user: { profile: { $: { fields: ['id'] } } },
    },
  });

  const profileIds = data.roles
    .filter((r) => permissions.isManagedRole(r.role))
    .map((r) => r.user?.profile?.id)
    .filter((profileId): profileId is string => !!profileId);

  const logId = id ?? generateId();

  return db.transact([
    db.tx.logs[logId].update({ color, name, teamId }).link({ team: teamId }),
    ...profileIds.map((pid) => db.tx.logs[logId].link({ profiles: pid })),
  ]);
};
