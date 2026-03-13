import { api } from '@/utilities/api';

export const inviteMember = async ({
  teamId,
  email,
  role,
}: {
  teamId: string;
  email: string;
  role: string;
}) => {
  const res = await api(`/teams/${teamId}/invites`, {
    body: JSON.stringify({ email, role }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!res?.ok) {
    const body = await res?.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to invite member');
  }

  return res.json();
};
