import { type Db } from '@/api/middleware/db';
import { id } from '@instantdb/admin';

export const memberJoinedActivity = (
  db: Db,
  actorId: string | undefined,
  teamId: string
) =>
  actorId
    ? [
        db.tx.activities[id()]
          .update({
            type: 'member_joined',
            date: new Date().toISOString(),
            teamId,
          })
          .link({ actor: actorId, team: teamId }),
      ]
    : [];

export const removeMember = async (
  db: Db,
  roleId: string,
  profileId: string,
  teamId: string
) => {
  const { logs } = await db.query({
    logs: {
      $: { where: { team: teamId } },
      profiles: { $: { where: { id: profileId } } },
    },
  });

  const memberLogs = logs.filter((log) => log.profiles.length > 0);

  await db.transact([
    db.tx.roles[roleId].delete(),
    ...memberLogs.map((log) =>
      db.tx.profiles[profileId].unlink({ logs: log.id })
    ),
    db.tx.activities[id()]
      .update({ type: 'member_left', date: new Date().toISOString(), teamId })
      .link({ actor: profileId, team: teamId }),
  ]);
};
