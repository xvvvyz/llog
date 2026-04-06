import { api } from '@/utilities/api';

export const redeemInviteLink = async ({ token }: { token: string }) => {
  const res = await api(`/teams/invite-links/${token}/redeem`, {
    method: 'POST',
  });

  if (!res?.ok) {
    const body = await res?.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to redeem invite link');
  }

  return res.json() as Promise<{ status: string; teamId: string }>;
};
