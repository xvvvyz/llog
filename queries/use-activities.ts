import { Role } from '@/enums/roles';
import { useTeams } from '@/queries/use-teams';
import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useActivities = () => {
  const auth = db.useAuth();
  const { teams } = useTeams();
  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);

  const { data, isLoading } = db.useQuery(
    auth.user && teamIds.length
      ? {
          activities: {
            $: {
              where: { teamId: { $in: teamIds } },
              order: { date: 'desc' },
              limit: 100,
            },
            actor: {
              image: {},
              logs: { $: { fields: ['id'] } },
            },
            team: {},
            record: { media: {} },
            comment: { media: {} },
            log: {},
          },
          roles: {
            $: { where: { userId: auth.user.id, teamId: { $in: teamIds } } },
          },
        }
      : null
  );

  const manageableTeamIds = useMemo(
    () =>
      new Set(
        (data?.roles ?? [])
          .filter(
            (role) => role.role === Role.Owner || role.role === Role.Admin
          )
          .map((role) => role.teamId)
      ),
    [data?.roles]
  );

  const activities = useMemo(
    () =>
      (data?.activities ?? []).filter((activity) => {
        if (
          activity.type !== 'member_joined' &&
          activity.type !== 'member_left'
        ) {
          return true;
        }

        if (manageableTeamIds.has(activity.teamId)) {
          return true;
        }

        return (activity.actor?.logs?.length ?? 0) > 0;
      }),
    [data?.activities, manageableTeamIds]
  );

  return { activities, isLoading };
};
