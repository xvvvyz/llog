import * as permissions from '@/features/teams/lib/permissions';
import { useTeams } from '@/features/teams/queries/use-teams';
import { db } from '@/lib/db';
import * as React from 'react';

export const useActivities = () => {
  const auth = db.useAuth();
  const { teams } = useTeams();
  const teamIds = React.useMemo(() => teams.map((t) => t.id), [teams]);

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
            team: { image: {} },
            record: { media: {} },
            reply: { media: {} },
            log: {},
          },
          roles: {
            $: { where: { userId: auth.user.id, teamId: { $in: teamIds } } },
          },
        }
      : null
  );

  const manageableTeamIds = React.useMemo(
    () =>
      new Set(
        (data?.roles ?? [])
          .filter((role) => permissions.canManageTeam(role.role))
          .map((role) => role.teamId)
      ),
    [data?.roles]
  );

  const activities = React.useMemo(
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
