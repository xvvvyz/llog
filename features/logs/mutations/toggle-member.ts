import { apiOrThrow } from '@/lib/api';

export const toggleLogMember = async ({
  roleId,
  selected,
  logId,
  teamId,
}: {
  roleId: string;
  selected: boolean;
  logId?: string;
  teamId?: string;
}) => {
  if (!logId || !teamId) return;

  await apiOrThrow(`/teams/${teamId}/logs/${logId}/members/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify({ selected }),
    headers: { 'Content-Type': 'application/json' },
  });
};
