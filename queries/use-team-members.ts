import { useMyRole } from '@/queries/use-my-role';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import * as p from '@/utilities/permissions';
import * as React from 'react';

export const useTeamMembers = ({ teamId }: { teamId?: string } = {}) => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;
  const myRole = useMyRole({ teamId: resolvedTeamId });

  const { data, isLoading } = db.useQuery(
    resolvedTeamId
      ? {
          roles: {
            $: { where: { team: resolvedTeamId } },
            user: {
              profile: {
                image: {},
                logs: { $: { fields: ['id'] } },
              },
            },
          },
        }
      : null
  );

  const members = data?.roles ?? [];

  const sortedMembers = React.useMemo(
    () =>
      [...members].sort((a, b) => {
        const roleOrder =
          (p.ROLE_SORT_ORDER[a.role as keyof typeof p.ROLE_SORT_ORDER] ??
            Number.MAX_SAFE_INTEGER) -
          (p.ROLE_SORT_ORDER[b.role as keyof typeof p.ROLE_SORT_ORDER] ??
            Number.MAX_SAFE_INTEGER);

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

      return p.canViewTeamMember({
        actorLogIds: myLogIds,
        actorRole: myRole.role,
        targetLogIds: memberLogIds,
        targetRole: member.role,
      });
    });
  }, [sortedMembers, myRole.canManage, myRole.role, auth.user?.id]);

  return { members: filteredMembers, allMembers: sortedMembers, isLoading };
};
