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
  const { data } = await db.queryOnce({
    logs: {
      $: {
        where: { team: teamId },
        fields: ['id'],
      },
    },
    roles: {
      $: { where: { id } },
      user: {
        profile: {
          $: { fields: ['id'] },
        },
      },
    },
  });

  const currentRole = data.roles[0]?.role;
  const profileId = data.roles[0]?.user?.profile?.id;
  const isManagedRole = (value?: string) =>
    value === Role.Owner || value === Role.Admin;

  const tx: any[] = [
    db.tx.roles[id].update({
      key: `${role}_${userId}_${teamId}`,
      role,
      teamId,
      userId,
    }),
  ];

  if (profileId && currentRole !== role) {
    const logIds = data.logs.map((log) => log.id);

    if (isManagedRole(role) && !isManagedRole(currentRole)) {
      tx.push(
        ...logIds.map((logId) =>
          db.tx.logs[logId].link({ profiles: profileId })
        )
      );
    }

    if (!isManagedRole(role) && isManagedRole(currentRole)) {
      tx.push(
        ...logIds.map((logId) =>
          db.tx.logs[logId].unlink({ profiles: profileId })
        )
      );
    }
  }

  return db.transact(tx);
};
