import { Role } from '@/types/role';

type InviteLike = {
  role: string;
  logs?: { id: string }[] | null;
};

export const findMemberInviteByLogs = <T extends InviteLike>(
  invites: T[],
  logIds: string[]
): T | undefined => {
  const sorted = [...logIds].sort();

  return invites.find((invite) => {
    if (invite.role !== Role.Member) return false;
    const inviteLogIds = [...(invite.logs?.map((l) => l.id) ?? [])].sort();
    if (inviteLogIds.length !== sorted.length) return false;
    return inviteLogIds.every((id, i) => id === sorted[i]);
  });
};
