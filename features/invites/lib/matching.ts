import { Role } from '@/domain/teams/role';
import type { Log } from '@/features/logs/types/log';
import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

type Invite = InstaQLEntity<typeof schema, 'invites'>;

type InviteLike = Pick<Invite, 'key' | 'role'> & {
  logs?: Pick<Log, 'id'>[] | null;
};

export const findMemberInviteByLogs = <T extends InviteLike>(
  invites: T[],
  logIds: string[]
): T | undefined => {
  const sorted = [...logIds].sort();

  return invites.find((invite) => {
    if (!invite.key) return false;
    if (invite.role !== Role.Member) return false;
    const inviteLogIds = [...(invite.logs?.map((l) => l.id) ?? [])].sort();
    if (inviteLogIds.length !== sorted.length) return false;
    return inviteLogIds.every((id, i) => id === sorted[i]);
  });
};
