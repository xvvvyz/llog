import * as permissions from '@/domain/teams/permissions';
import { useUi } from '@/features/account/queries/use-ui';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

export const useTeamMembers = ({ teamId }: { teamId?: string | null } = {}) => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId === null ? undefined : (teamId ?? activeTeamId);
  const myRole = useMyRole({ teamId: resolvedTeamId });

  const { data, isLoading } = db.useQuery(
    resolvedTeamId
      ? {
          roles: {
            $: { where: { team: resolvedTeamId } },
            user: { profile: { image: {}, logs: { $: { fields: ['id'] } } } },
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(resolvedTeamId, data);

  const members = React.useMemo(
    () => (resolvedTeamId && hasCurrentResult ? (data?.roles ?? []) : []),
    [data?.roles, hasCurrentResult, resolvedTeamId]
  );

  const sortedMembers = React.useMemo(
    () =>
      [...members].sort((a, b) => {
        const roleOrder =
          permissions.getRoleSortOrder(a.role) -
          permissions.getRoleSortOrder(b.role);

        if (roleOrder !== 0) return roleOrder;
        const aName = a.user?.profile?.name?.trim() ?? '';
        const bName = b.user?.profile?.name?.trim() ?? '';
        return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      }),
    [members]
  );

  const filteredMembers = React.useMemo(() => {
    if (myRole.canManage) return sortedMembers;
    const myMember = sortedMembers.find((m) => m.userId === auth.user?.id);
    const myLogIds = myMember?.user?.profile?.logs?.map((l) => l.id) ?? [];

    return sortedMembers.filter((member) => {
      const memberLogIds = member.user?.profile?.logs?.map((l) => l.id) ?? [];

      return permissions.canViewTeamMember({
        actorLogIds: myLogIds,
        actorRole: myRole.role,
        targetLogIds: memberLogIds,
        targetRole: member.role,
      });
    });
  }, [sortedMembers, myRole.canManage, myRole.role, auth.user?.id]);

  const isReady = !resolvedTeamId || (hasCurrentResult && myRole.isReady);

  return {
    members: filteredMembers,
    allMembers: sortedMembers,
    isReady,
    isLoading:
      !!resolvedTeamId && (isLoading || !hasCurrentResult || myRole.isLoading),
  };
};
