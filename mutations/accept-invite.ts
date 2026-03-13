import { api } from '@/utilities/api';

export const acceptInvite = async ({ id }: { id: string }) => {
  const res = await api(`/teams/invites/${id}/accept`, { method: 'POST' });

  if (!res?.ok) {
    const body = await res?.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to accept invite');
  }

  return res.json();
};
