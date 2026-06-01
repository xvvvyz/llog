import { Role } from '@/domain/teams/role';
import { apiOrThrow } from '@/lib/api';
import { db } from '@/lib/db';

type UpdatedRole = {
  id: string;
  key: string;
  role: Role.Admin | Role.Member;
  teamId: string;
  userId: string;
};

export const updateRole = async ({
  roleId,
  role,
  teamId,
}: {
  roleId: string;
  role: Role.Admin | Role.Member;
  teamId: string;
}) => {
  const response = await apiOrThrow(`/teams/${teamId}/members/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { 'Content-Type': 'application/json' },
  });

  const result = (await response.json()) as { role?: UpdatedRole };
  if (!result.role) return;

  await db.transact(
    db.tx.roles[result.role.id].update({
      key: result.role.key,
      role: result.role.role,
      teamId: result.role.teamId,
      userId: result.role.userId,
    })
  );
};
