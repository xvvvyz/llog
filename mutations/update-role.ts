import { apiOrThrow } from '@/lib/api';
import { Role } from '@/types/role';

export const updateRole = async ({
  roleId,
  role,
  teamId,
}: {
  roleId: string;
  role: Role.Admin | Role.Member;
  teamId: string;
}) => {
  await apiOrThrow(`/teams/${teamId}/members/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { 'Content-Type': 'application/json' },
  });
};
