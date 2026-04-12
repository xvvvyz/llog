import { Role } from '@/types/role';
import { apiOrThrow } from '@/utilities/api';

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
