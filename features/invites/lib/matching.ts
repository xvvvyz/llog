import { normalizeInviteLogIds } from '@/domain/invites/invite-link';
import { Role } from '@/domain/teams/role';
import type { Log } from '@/features/logs/types/log';
import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

type Invite = InstaQLEntity<typeof schema, 'invites'>;
type InviteLike = Pick<Invite, 'role'> & { logs?: Pick<Log, 'id'>[] | null };

export const findMemberInviteByLogs = <T extends InviteLike>(
  invites: T[],
  logIds: string[]
): T | undefined => {
  const sorted = normalizeInviteLogIds(logIds).sort();

  return invites.find((invite) => {
    if (invite.role !== Role.Member) return false;

    const inviteLogIds = normalizeInviteLogIds(
      invite.logs?.map((log) => log.id)
    ).sort();

    if (inviteLogIds.length !== sorted.length) return false;
    return inviteLogIds.every((id, i) => id === sorted[i]);
  });
};
