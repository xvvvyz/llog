import { visibleFileQuery } from '@/domain/files/query';
import * as permissions from '@/domain/teams/permissions';
import * as activityGroups from '@/features/activity/lib/group-activities';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
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

  const hasCurrentViewerResult = useCurrentQueryResult(
    auth.user?.id,
    viewerData
  );

  const viewerIsLoading =
    !!auth.user && (viewerLoading || !hasCurrentViewerResult);

  const roles = React.useMemo(
    () =>
      auth.user && hasCurrentViewerResult ? (viewerData?.roles ?? []) : [],
    [auth.user, hasCurrentViewerResult, viewerData?.roles]
  );

  const currentProfileId =
    auth.user && hasCurrentViewerResult
      ? viewerData?.profiles?.[0]?.id
      : undefined;

  const teamIds = React.useMemo(
    () => Array.from(new Set(roles.map((role) => role.teamId))),
    [roles]
  );

  const teamIdsKey = teamIds.join(':');

  const visibleLogsQueryKey =
    auth.user && teamIds.length > 0 ? teamIdsKey : undefined;

  const { data: visibleLogsData, isLoading: visibleLogsLoading } = db.useQuery(
    auth.user && teamIds.length > 0
      ? {
          logs: {
            $: { fields: ['id' as const], where: { teamId: { $in: teamIds } } },
          },
        }
      : null
  );

  const hasCurrentVisibleLogsResult = useCurrentQueryResult(
    visibleLogsQueryKey,
    visibleLogsData
  );

  const visibleLogIds = React.useMemo(
    () =>
      hasCurrentVisibleLogsResult
        ? Array.from(
            new Set((visibleLogsData?.logs ?? []).map((log) => log.id))
          ).filter((id): id is string => !!id)
        : [],
    [hasCurrentVisibleLogsResult, visibleLogsData?.logs]
  );

  const visibleLogIdsKey = visibleLogIds.join(':');
  const visibleLogsReady = !visibleLogsQueryKey || hasCurrentVisibleLogsResult;

  const visibleLogsAreLoading =
    !!visibleLogsQueryKey &&
    (visibleLogsLoading || !hasCurrentVisibleLogsResult);

  const manageableTeamIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          roles
            .filter((role) => permissions.canManageTeam(role.role))
            .map((role) => role.teamId)
        )
      ),
    [roles]
  );

  const manageableTeamIdsKey = manageableTeamIds.join(':');

  const manageableTeamIdsSet = React.useMemo(
    () => new Set(manageableTeamIds),
    [manageableTeamIds]
  );

  const activityFilters = React.useMemo(() => {
    const filters: unknown[] = [];

    if (visibleLogIds.length > 0) {
      filters.push({
        'log.id': { $in: visibleLogIds },
        'record.id': { $isNull: false },
        type: { $in: [...RECORD_REQUIRED_ACTIVITY_TYPES] },
      });

      filters.push({
        'actor.logs.id': { $in: visibleLogIds },
        type: { $in: [...MEMBER_ACTIVITY_TYPES] },
      });
    }

    if (manageableTeamIds.length > 0) {
      filters.push({
        teamId: { $in: manageableTeamIds },
        type: { $in: [...MEMBER_ACTIVITY_TYPES] },
      });
    }

    return filters;
  }, [manageableTeamIds, visibleLogIds]);

  const hasVisibleActivityScope = activityFilters.length > 0;

  const activitiesQuery =
    auth.user &&
    teamIds.length > 0 &&
    currentProfileId &&
    visibleLogsReady &&
    hasVisibleActivityScope
      ? {
          activities: {
            $: {
              // InstantDB types do not model relation-path filters here.
              where: {
                'actor.id': { $ne: currentProfileId },
                or: activityFilters,
                teamId: { $in: teamIds },
                type: { $in: [...activityGroups.GROUPED_ACTIVITY_TYPES] },
              } as never,
              order: { date: 'desc' as const },
              limit: ACTIVITIES_PAGE_SIZE,
            },
            actor: { image: {}, logs: { $: { fields: ['id' as const] } } },
            team: { image: {} },
            record: { files: visibleFileQuery, links: {} },
            reply: { files: visibleFileQuery, links: {} },
            log: {},
          },
        }
      : (null as never);

  const shouldQueryActivities = activitiesQuery !== null;

  const {
    data,
    canLoadNextPage: canLoadQueriedNextPage,
    loadNextPage,
  } = db.useInfiniteQuery(activitiesQuery);

  const queryKey = `${currentProfileId ?? ''}:${teamIdsKey}:${manageableTeamIdsKey}:${visibleLogIdsKey}`;

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

  const hasActivitiesSnapshot =
    !shouldQueryActivities || activitiesCacheRef.current.hasReceived;

  const rawActivities =
    queriedActivities ?? activitiesCacheRef.current.activities;

  const canLoadActivitiesNextPage =
    shouldQueryActivities && hasActivitiesSnapshot && canLoadQueriedNextPage;

  const activities = rawActivities;

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage: canLoadActivitiesNextPage,
    itemCount: rawActivities.length,
    loadNextPage,
    requestKey: queryKey,
  });

  const autoLoadCountRef = React.useRef(0);

  React.useEffect(() => {
    autoLoadCountRef.current = 0;
  }, [currentProfileId, manageableTeamIdsKey, teamIdsKey, visibleLogIdsKey]);

  React.useEffect(() => {
    if (
      !canLoadActivitiesNextPage ||
      activities.length >= ACTIVITIES_MIN_RENDERED_BEFORE_SCROLL
    ) {
      return;
    }

    if (autoLoadCountRef.current >= ACTIVITIES_AUTO_LOAD_LIMIT) return;
    if (handleLoadNextPage()) autoLoadCountRef.current += 1;
  }, [activities.length, canLoadActivitiesNextPage, handleLoadNextPage]);

  const isAutoLoadingInitialActivities =
    activities.length === 0 &&
    canLoadActivitiesNextPage &&
    autoLoadCountRef.current < ACTIVITIES_AUTO_LOAD_LIMIT;

  return {
    activities,
    canLoadNextPage: canLoadActivitiesNextPage,
    manageableTeamIds: manageableTeamIdsSet,
    isLoading:
      viewerIsLoading ||
      visibleLogsAreLoading ||
      (shouldQueryActivities && !hasActivitiesSnapshot) ||
      isAutoLoadingInitialActivities,
    loadNextPage: handleLoadNextPage,
  };
};
