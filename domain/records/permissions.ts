import * as teamPermissions from '@/domain/teams/permissions';

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
