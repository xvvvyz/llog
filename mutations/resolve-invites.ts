import { api } from '@/utilities/api';

export const resolveInvites = async () => {
  const res = await api('/teams/resolve-invites', { method: 'POST' });

  if (!res?.ok) {
    return { joined: [] };
  }

  return res.json();
};
