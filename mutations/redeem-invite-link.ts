import { api } from '@/utilities/api';

export const redeemInviteLink = async ({ token }: { token: string }) => {
  const res = await api(`/teams/invite-links/${token}/redeem`, {
    method: 'POST',
  });

  if (!res?.ok) {
    let body: { message?: string } | null = null;

    try {
      body = await res?.json();
    } catch {
      body = null;
    }

    throw new Error(body?.message ?? 'Failed to redeem invite link');
  }

  return (await res.json()) as { status: string; teamId: string };
};
