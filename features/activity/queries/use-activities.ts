import * as permissions from '@/domain/teams/permissions';
import * as activityGroups from '@/features/activity/lib/group-activities';
import { useLoadNextPage } from '@/hooks/use-load-next-page';
import { db } from '@/lib/db';
import * as React from 'react';

const ACTIVITIES_PAGE_SIZE = 50;
const ACTIVITIES_AUTO_LOAD_LIMIT = 6;
const ACTIVITIES_MIN_RENDERED_BEFORE_SCROLL = 10;
const MEMBER_ACTIVITY_TYPES = ['member_joined', 'member_left'] as const;

const RECORD_REQUIRED_ACTIVITY_TYPES = [
  'reaction_added',
  'record_published',
  'reply_posted',
] as const;

export const useActivities = () => {
  const auth = db.useAuth();

  const { data: viewerData, isLoading: viewerLoading } = db.useQuery(
    auth.user
      ? {
          profiles: { $: { fields: ['id'], where: { user: auth.user.id } } },
          roles: { $: { where: { userId: auth.user.id } } },
        }
      : null
  );

  const roles = viewerData?.roles ?? [];
  const currentProfileId = viewerData?.profiles?.[0]?.id;

  const teamIds = React.useMemo(
    () => Array.from(new Set(roles.map((role) => role.teamId))),
    [roles]
  );

  const teamIdsKey = teamIds.join(':');

  const [activityLimit, setActivityLimit] =
    React.useState(ACTIVITIES_PAGE_SIZE);

  React.useEffect(() => {
    setActivityLimit(ACTIVITIES_PAGE_SIZE);
  }, [currentProfileId, teamIdsKey]);

  const activitiesQuery =
    auth.user && teamIds.length > 0 && currentProfileId
      ? {
          activities: {
            $: {
              // InstantDB types do not model relation-path filters here.
              where: {
                'actor.id': { $ne: currentProfileId },
                or: [
                  {
                    'record.id': { $isNull: false },
                    type: { $in: [...RECORD_REQUIRED_ACTIVITY_TYPES] },
                  },
                  { type: { $in: [...MEMBER_ACTIVITY_TYPES] } },
                ],
                teamId: { $in: teamIds },
                type: { $in: [...activityGroups.GROUPED_ACTIVITY_TYPES] },
              } as never,
              order: { date: 'desc' as const },
              limit: activityLimit,
            },
            actor: { image: {}, logs: { $: { fields: ['id' as const] } } },
            team: { image: {} },
            record: { files: {}, links: {} },
            reply: { files: {}, links: {} },
            log: {},
          },
        }
      : (null as never);

  const shouldQueryActivities = activitiesQuery !== null;

  const {
    data,
    isLoading: activitiesLoading,
    pageInfo,
  } = db.useQuery(activitiesQuery);

  const manageableTeamIds = React.useMemo(
    () =>
      new Set(
        roles
          .filter((role) => permissions.canManageTeam(role.role))
          .map((role) => role.teamId)
      ),
    [roles]
  );

  const queryKey = `${currentProfileId ?? ''}:${teamIdsKey}`;

  const activitiesCacheRef = React.useRef<{
    activities: activityGroups.ActivityWithRelations[];
    hasReceived: boolean;
    key: string;
  }>({ activities: [], hasReceived: false, key: '' });

  if (activitiesCacheRef.current.key !== queryKey) {
    activitiesCacheRef.current = {
      activities: [],
      hasReceived: false,
      key: queryKey,
    };
  }

  const queriedActivities = data?.activities;

  if (queriedActivities) {
    activitiesCacheRef.current = {
      activities: queriedActivities,
      hasReceived: true,
      key: queryKey,
    };
  }

  const hasViewerSnapshot = !auth.user || viewerData !== undefined;

  const hasActivitiesSnapshot =
    !shouldQueryActivities || activitiesCacheRef.current.hasReceived;

  const rawActivities =
    queriedActivities ?? activitiesCacheRef.current.activities;

  const canLoadNextPage =
    shouldQueryActivities && !!pageInfo?.activities?.hasNextPage;

  const activities = React.useMemo(
    () =>
      rawActivities.filter((activity) => {
        if (
          activity.type !== 'member_joined' &&
          activity.type !== 'member_left'
        ) {
          return true;
        }

        if (manageableTeamIds.has(activity.teamId)) return true;
        return (activity.actor?.logs?.length ?? 0) > 0;
      }),
    [manageableTeamIds, rawActivities]
  );

  const loadNextPage = React.useCallback(() => {
    if (!canLoadNextPage) return;
    setActivityLimit((limit) => limit + ACTIVITIES_PAGE_SIZE);
  }, [canLoadNextPage]);

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage,
    itemCount: rawActivities.length,
    loadNextPage,
    requestKey: activityLimit,
  });

  const autoLoadCountRef = React.useRef(0);

  React.useEffect(() => {
    autoLoadCountRef.current = 0;
  }, [currentProfileId, teamIdsKey]);

  React.useEffect(() => {
    if (
      !canLoadNextPage ||
      activities.length >= ACTIVITIES_MIN_RENDERED_BEFORE_SCROLL
    ) {
      return;
    }

    if (autoLoadCountRef.current >= ACTIVITIES_AUTO_LOAD_LIMIT) return;
    autoLoadCountRef.current += 1;
    loadNextPage();
  }, [activities.length, canLoadNextPage, loadNextPage]);

  return {
    activities,
    canLoadNextPage,
    isLoading:
      !hasViewerSnapshot ||
      viewerLoading ||
      (shouldQueryActivities && !hasActivitiesSnapshot && activitiesLoading),
    loadNextPage: handleLoadNextPage,
  };
};
