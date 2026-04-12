import { Role } from '@/enums/roles';
import { useMyRole } from '@/queries/use-my-role';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { useMemo } from 'react';

const ROLE_SORT_ORDER: Record<string, number> = {
  [Role.Owner]: 0,
  [Role.Admin]: 1,
  [Role.Member]: 2,
};

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

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const roleOrder =
          (ROLE_SORT_ORDER[a.role] ?? Number.MAX_SAFE_INTEGER) -
          (ROLE_SORT_ORDER[b.role] ?? Number.MAX_SAFE_INTEGER);

        if (roleOrder !== 0) return roleOrder;
        const aName = a.user?.profile?.name?.trim() ?? '';
        const bName = b.user?.profile?.name?.trim() ?? '';
        return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      }),
    [members]
  );

  const filteredMembers = useMemo(() => {
    if (myRole.canManage) return sortedMembers;
    const myMember = sortedMembers.find((m) => m.userId === auth.user?.id);

    const myLogIds = new Set(
      myMember?.user?.profile?.logs?.map((l: { id: string }) => l.id) ?? []
    );

    return sortedMembers.filter((member) => {
      if (member.role === Role.Owner || member.role === Role.Admin) return true;

      const memberLogIds =
        member.user?.profile?.logs?.map((l: { id: string }) => l.id) ?? [];

      return memberLogIds.some((id: string) => myLogIds.has(id));
    });
  }, [sortedMembers, myRole.canManage, auth.user?.id]);

  return { members: filteredMembers, allMembers: sortedMembers, isLoading };
};
