import { Role } from '@/types/role';

export const ROLE_SORT_ORDER: Record<Role, number> = {
  [Role.Owner]: 0,
  [Role.Admin]: 1,
  [Role.Member]: 2,
};

export const isOwnerRole = (role?: string | null): role is Role.Owner =>
  role === Role.Owner;

export const isAdminRole = (role?: string | null): role is Role.Admin =>
  role === Role.Admin;

export const isMemberRole = (role?: string | null): role is Role.Member =>
  role === Role.Member;

export const isRole = (role?: string | null): role is Role =>
  isOwnerRole(role) || isAdminRole(role) || isMemberRole(role);

export const isManagedRole = (
  role?: string | null
): role is Role.Owner | Role.Admin => isOwnerRole(role) || isAdminRole(role);

export const canManageTeam = (role?: string | null) => isManagedRole(role);

export const getTeamPermissionFlags = (role?: string | null) => {
  const isOwner = isOwnerRole(role);
  const isAdmin = isAdminRole(role);
  const canManage = isOwner || isAdmin;

  return {
    canDeleteTeam: isOwner,
    canLeaveTeam: !!role && !isOwner,
    canManage,
    canManageInvites: canManage,
    canManageLogs: canManage,
    canManageMembers: canManage,
    canPinRecords: canManage,
    canViewRestrictedActivity: canManage,
    isAdmin,
    isOwner,
  };
};

interface TeamMemberPolicyInput {
  actorRole?: string | null;
  isSelf?: boolean;
  targetRole?: string | null;
}

export const canOpenTeamMemberMenu = ({
  actorRole,
  isSelf = false,
  targetRole,
}: TeamMemberPolicyInput) => {
  if (!targetRole || !isManagedRole(actorRole) || isSelf) return false;
  if (isOwnerRole(actorRole)) return true;
  return targetRole !== Role.Owner;
};

interface ChangeTeamMemberRoleInput extends TeamMemberPolicyInput {
  nextRole?: string | null;
}

export const canChangeTeamMemberRole = ({
  actorRole,
  isSelf = false,
  nextRole,
  targetRole,
}: ChangeTeamMemberRoleInput) => {
  if (
    !canOpenTeamMemberMenu({ actorRole, isSelf, targetRole }) ||
    (nextRole !== Role.Admin && nextRole !== Role.Member)
  ) {
    return false;
  }

  if (isOwnerRole(actorRole)) return true;

  return (
    (targetRole === Role.Member && nextRole === Role.Admin) ||
    (targetRole === Role.Admin && nextRole === Role.Member)
  );
};

export const canRemoveTeamMember = ({
  actorRole,
  isSelf = false,
  targetRole,
}: TeamMemberPolicyInput) => {
  if (!canOpenTeamMemberMenu({ actorRole, isSelf, targetRole })) return false;
  if (isOwnerRole(actorRole)) return true;
  return targetRole === Role.Member;
};

export const canManageLogMember = ({
  actorRole,
  targetRole,
}: Pick<TeamMemberPolicyInput, 'actorRole' | 'targetRole'>) =>
  isManagedRole(actorRole) && isMemberRole(targetRole);

export const getRoleSortOrder = (role?: string | null) =>
  isRole(role) ? ROLE_SORT_ORDER[role] : Number.MAX_SAFE_INTEGER;

const toIdSet = (ids?: Iterable<string>) => new Set(ids ?? []);

export const hasSharedLogAccess = (
  actorLogIds?: Iterable<string>,
  targetLogIds?: Iterable<string>
) => {
  const actorIds = toIdSet(actorLogIds);
  if (!actorIds.size) return false;

  for (const logId of toIdSet(targetLogIds)) {
    if (actorIds.has(logId)) return true;
  }

  return false;
};

export const canViewTeamMember = ({
  actorLogIds,
  actorRole,
  targetLogIds,
  targetRole,
}: {
  actorLogIds?: Iterable<string>;
  actorRole?: string | null;
  targetLogIds?: Iterable<string>;
  targetRole?: string | null;
}) => {
  if (isManagedRole(actorRole) || isManagedRole(targetRole)) return true;
  return hasSharedLogAccess(actorLogIds, targetLogIds);
};

export const canDeleteOwnOrManagedResource = ({
  actorRole,
  isAuthor,
}: {
  actorRole?: string | null;
  isAuthor: boolean;
}) => isAuthor || isManagedRole(actorRole);

export const getInviteRedemptionRole = ({
  currentRole,
  invitedRole,
}: {
  currentRole?: string | null;
  invitedRole?: string | null;
}) => {
  if (currentRole === Role.Owner) return Role.Owner;
  if (invitedRole === Role.Admin) return Role.Admin;
  return currentRole;
};
