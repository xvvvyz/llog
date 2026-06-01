import { Role } from '@/domain/teams/role';
import { getProfile } from '@/features/account/queries/get-profile';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';
import { nanoid } from 'nanoid';
import * as inviteLink from '@/features/invites/lib/invite-link';

const INVITE_TOKEN_LENGTH = 6;

export const createInviteLink = async ({
  teamId,
  role,
  logIds,
}: {
  teamId: string;
  role: string;
  logIds?: string[];
}) => {
  const creator = await getProfile();
  if (!creator?.id) throw new Error('Profile not found');
  const token = nanoid(INVITE_TOKEN_LENGTH);
  const inviteId = id();
  const normalizedLogIds = inviteLink.normalizeInviteLogIds(logIds);

  if (role === Role.Member && normalizedLogIds.length === 0) {
    throw new Error('Member invite links require at least one log');
  }

  if (role === Role.Admin && normalizedLogIds.length > 0) {
    throw new Error('Admin invite links cannot be scoped to logs');
  }

  const key = inviteLink.getInviteKey({ role, teamId, token });

  await db.transact(
    db.tx.invites[inviteId]
      .update({ key, role, teamId, token })
      .link({
        creator: creator.id,
        team: teamId,
        ...(normalizedLogIds.length ? { logs: normalizedLogIds } : {}),
      })
  );

  return { id: inviteId, key, token };
};
