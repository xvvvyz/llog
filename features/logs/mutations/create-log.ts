import * as permissions from '@/domain/teams/permissions';
import type { Log } from '@/features/logs/types/log';
import { getActiveTeamId } from '@/features/teams/queries/get-active-team-id';
import { db } from '@/lib/db';
import type { Color } from '@/theme/spectrum';
import { id as generateId } from '@instantdb/react-native';

export const createLog = async ({
  color,
  id,
  name,
}: {
  color: Color;
  id?: Log['id'];
  name: Log['name'];
}) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  const { data } = await db.queryOnce({
    roles: {
      $: { fields: ['role'], where: { team: teamId } },
      user: { profile: { $: { fields: ['id'] } } },
    },
  });

  const profileIds = data.roles
    .filter((r) => permissions.isManagedRole(r.role))
    .map((r) => r.user?.profile?.id)
    .filter((profileId): profileId is string => !!profileId);

  const logId = id ?? generateId();
  const trimmedName = name.trim();

  await db.transact([
    db.tx.logs[logId]
      .update({ color, name: trimmedName, teamId })
      .link({ team: teamId }),
    ...profileIds.map((pid) => db.tx.logs[logId].link({ profiles: pid })),
  ]);

  return logId;
};
