import { api } from '@/utilities/api';

export const createInviteLink = async ({
  teamId,
  role,
  logIds,
  expiresAt,
}: {
  teamId: string;
  role: string;
  logIds?: string[];
  expiresAt?: number;
}) => {
  const res = await api(`/teams/${teamId}/invite-links`, {
    body: JSON.stringify({ role, logIds, expiresAt }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!res?.ok) {
    const body = await res?.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to create invite link');
  }

  return res.json() as Promise<{ token: string }>;
};
