import { api } from '@/utilities/api';

export const createInviteLink = async ({
  teamId,
  role,
  logIds,
}: {
  teamId: string;
  role: string;
  logIds?: string[];
}) => {
  const res = await api(`/teams/${teamId}/invite-links`, {
    body: JSON.stringify({ role, logIds }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!res?.ok) {
    let body: { message?: string } | null = null;

    try {
      body = await res?.json();
    } catch {
      body = null;
    }

    throw new Error(body?.message ?? 'Failed to create invite link');
  }

  return (await res.json()) as { token: string };
};
