import { Role } from '@/domain/teams/role';

type InviteLinkMember = {
  avatarSeedId?: string;
  id: string;
  image?: string;
  name?: string;
};

export type InviteLinkInfo = {
  isValid: boolean;
  logNames?: string[];
  members?: InviteLinkMember[];
  role?: Role;
  teamId?: string;
  teamName?: string;
};

export type InviteLogScope = {
  logs?: readonly { id?: string | null }[] | null;
  role?: string | null;
};

export const normalizeInviteLogIds = (
  logIds?: readonly (string | null | undefined)[]
) => [
  ...new Set(
    (logIds ?? [])
      .map((logId) => logId?.trim())
      .filter((logId): logId is string => !!logId)
  ),
];

export const getInviteLogIds = (invite?: InviteLogScope | null) =>
  normalizeInviteLogIds(invite?.logs?.map((log) => log.id) ?? []);

export const hasValidInviteLogScope = (invite?: InviteLogScope | null) => {
  const logIds = getInviteLogIds(invite);
  if (invite?.role === Role.Admin) return logIds.length === 0;
  if (invite?.role === Role.Member) return logIds.length > 0;
  return false;
};
