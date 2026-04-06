import { Role } from '@/enums/roles';
import { useMyRole } from '@/queries/use-my-role';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useTeamMembers = () => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();
  const myRole = useMyRole();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? {
          roles: {
            $: { where: { team: activeTeamId } },
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

  const filteredMembers = useMemo(() => {
    if (myRole.canManage) return members;
    const myMember = members.find((m) => m.userId === auth.user?.id);

    const myLogIds = new Set(
      myMember?.user?.profile?.logs?.map((l: { id: string }) => l.id) ?? []
    );

    return members.filter((member) => {
      if (member.role === Role.Owner || member.role === Role.Admin) return true;

      const memberLogIds =
        member.user?.profile?.logs?.map((l: { id: string }) => l.id) ?? [];

      return memberLogIds.some((id: string) => myLogIds.has(id));
    });
  }, [members, myRole.canManage, auth.user?.id]);

  return { members: filteredMembers, allMembers: members, isLoading };
};
