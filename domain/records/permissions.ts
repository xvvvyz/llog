import * as teamPermissions from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';

export const canEditEntry = ({
  actorRole,
  isAuthor,
  targetRole,
}: {
  actorRole?: string | null;
  isAuthor: boolean;
  targetRole?: string | null;
}) => {
  if (isAuthor) return true;
  if (teamPermissions.isOwnerRole(actorRole)) return true;
  return actorRole === Role.Admin && teamPermissions.isMemberRole(targetRole);
};

export const canDeleteRecord = ({
  actorRole,
  hasLog,
  isAuthor,
  isDraft,
}: {
  actorRole?: string | null;
  hasLog: boolean;
  isAuthor: boolean;
  isDraft: boolean;
}) =>
  teamPermissions.canDeleteOwnOrManagedResource({
    actorRole,
    isAuthor: isAuthor && (!!actorRole || (!hasLog && isDraft)),
  });
