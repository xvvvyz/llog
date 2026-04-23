import * as permissions from '@/features/teams/lib/permissions';
import { useLoadNextPage } from '@/hooks/use-load-next-page';
import { db } from '@/lib/db';
import * as React from 'react';

export const useActivities = () => {
  const auth = db.useAuth();

  const { data: rolesData, isLoading: rolesLoading } = db.useQuery(
    auth.user
      ? {
          roles: {
            $: { where: { userId: auth.user.id } },
          },
        }
      : null
  );

  const roles = rolesData?.roles ?? [];

  const teamIds = React.useMemo(
    () => Array.from(new Set(roles.map((role) => role.teamId))),
    [roles]
  );

  const shouldQueryActivities = !!auth.user && teamIds.length > 0;

  const {
    data,
    isLoading: activitiesLoading,
    canLoadNextPage,
    loadNextPage,
  } = db.useInfiniteQuery(
    shouldQueryActivities
      ? {
          activities: {
            $: {
              where: { teamId: { $in: teamIds } },
              order: { date: 'desc' },
              limit: 25,
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
        }
      : (null as never)
  );

  const manageableTeamIds = React.useMemo(
    () =>
      new Set(
        roles
          .filter((role) => permissions.canManageTeam(role.role))
          .map((role) => role.teamId)
      ),
    [roles]
  );

  const hasRolesSnapshot = !auth.user || rolesData !== undefined;
  const hasActivitiesSnapshot = !shouldQueryActivities || data !== undefined;
  const rawActivities = data?.activities ?? [];

  const activities = React.useMemo(
    () =>
      rawActivities.filter((activity) => {
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
    [manageableTeamIds, rawActivities]
  );

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage: shouldQueryActivities ? canLoadNextPage : false,
    itemCount: rawActivities.length,
    loadNextPage,
  });

  return {
    activities,
    canLoadNextPage: shouldQueryActivities ? canLoadNextPage : false,
    isLoading:
      !hasRolesSnapshot ||
      rolesLoading ||
      (shouldQueryActivities && (activitiesLoading || !hasActivitiesSnapshot)),
    loadNextPage: handleLoadNextPage,
  };
};
