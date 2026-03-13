import { api } from '@/utilities/api';

export const declineInvite = async ({ id }: { id: string }) => {
  const res = await api(`/teams/invites/${id}/decline`, { method: 'POST' });

  if (!res?.ok) {
    const body = await res?.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to decline invite');
  }

  return res.json();
};
