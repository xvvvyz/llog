import { visibleFileQuery } from '@/domain/files/query';
import * as permissions from '@/domain/teams/permissions';
import type { ActivityWithRelations } from '@/features/activity/lib/group-activities';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useKeyedQueryCache } from '@/hooks/use-keyed-query-cache';
import { useLoadNextPage } from '@/hooks/use-load-next-page';
import { db } from '@/lib/db';
import * as React from 'react';

const ACTIVITIES_PAGE_SIZE = 25;
const MEMBER_ACTIVITY_TYPES = ['member_joined', 'member_left'] as const;

const RECORD_REQUIRED_ACTIVITY_TYPES = [
  'reaction_added',
  'record_published',
  'reply_posted',
] as const;

const EMPTY_ACTIVITIES: ActivityWithRelations[] = [];
const EMPTY_VISIBLE_LOG_IDS: string[] = [];
const activityLinkFields = ['id', 'label', 'order', 'teamId', 'url'] as const;

const activityLinkQuery = {
  $: {
    fields: [...activityLinkFields] as (typeof activityLinkFields)[number][],
  },
};

const activityActorQuery = {
  $: { fields: ['avatarSeedId' as const, 'id' as const, 'name' as const] },
  image: {
    $: {
      fields: [
        'id' as const,
        'order' as const,
        'type' as const,
        'uri' as const,
      ],
    },
  },
};

const activityTeamQuery = {
  $: { fields: ['id' as const, 'name' as const] },
  image: {
    $: {
      fields: [
        'id' as const,
        'order' as const,
        'type' as const,
        'uri' as const,
      ],
    },
  },
};

const activityRecordQuery = {
  $: {
    fields: [
      'date' as const,
      'id' as const,
      'isDraft' as const,
      'teamId' as const,
      'text' as const,
    ],
  },
  files: visibleFileQuery,
  links: activityLinkQuery,
};

const activityReplyQuery = {
  $: {
    fields: [
      'date' as const,
      'id' as const,
      'isDraft' as const,
      'teamId' as const,
      'text' as const,
    ],
  },
  files: visibleFileQuery,
  links: activityLinkQuery,
};

const activityLogQuery = {
  $: {
    fields: [
      'color' as const,
      'id' as const,
      'name' as const,
      'teamId' as const,
    ],
  },
};

export const useActivities = () => {
  const auth = db.useAuth();

  const { data: viewerData, isLoading: viewerLoading } = db.useQuery(
    auth.user
      ? {
          profiles: {
            $: { fields: ['id' as const], where: { user: auth.user.id } },
          },
          roles: {
            $: {
              fields: ['role' as const, 'teamId' as const],
              where: { userId: auth.user.id },
            },
          },
        }
      : null
  );

  const viewerQueryKey = auth.user ? auth.user.id : undefined;

  const hasCurrentViewerResult = useCurrentQueryResult(
    viewerQueryKey,
    viewerData
  );

  const viewerIsLoading =
    !!viewerQueryKey && (viewerLoading || !hasCurrentViewerResult);

  const roles = React.useMemo(
    () =>
      viewerQueryKey && hasCurrentViewerResult ? (viewerData?.roles ?? []) : [],
    [hasCurrentViewerResult, viewerData?.roles, viewerQueryKey]
  );

  const currentProfileId =
    viewerQueryKey && hasCurrentViewerResult
      ? viewerData?.profiles?.[0]?.id
      : undefined;

  const teamIds = React.useMemo(
    () => Array.from(new Set(roles.map((role) => role.teamId))).sort(),
    [roles]
  );

  const teamIdsKey = teamIds.join(':');

  const manageableTeamIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          roles
            .filter((role) => permissions.canManageTeam(role.role))
            .map((role) => role.teamId)
        )
      ).sort(),
    [roles]
  );

  const manageableTeamIdsSet = React.useMemo(
    () => new Set(manageableTeamIds),
    [manageableTeamIds]
  );

  const manageableTeamIdsKey = manageableTeamIds.join(':');

  const visibleLogsQueryKey =
    hasCurrentViewerResult && teamIds.length > 0 ? teamIdsKey : undefined;

  const { data: visibleLogsData, isLoading: visibleLogsLoading } = db.useQuery(
    visibleLogsQueryKey
      ? {
          logs: {
            $: { fields: ['id' as const], where: { teamId: { $in: teamIds } } },
          },
        }
      : null
  );

  const nextVisibleLogIds = React.useMemo(
    () =>
      visibleLogsData?.logs
        ? Array.from(new Set(visibleLogsData.logs.map((log) => log.id)))
            .filter((id): id is string => !!id)
            .sort()
        : undefined,
    [visibleLogsData?.logs]
  );

  const { hasSnapshot: hasVisibleLogsSnapshot, value: visibleLogIds } =
    useKeyedQueryCache({
      emptyValue: EMPTY_VISIBLE_LOG_IDS,
      queryKey: visibleLogsQueryKey,
      value: nextVisibleLogIds,
    });

  const visibleLogIdsKey = visibleLogIds.join(':');

  const visibleLogsAreLoading =
    !!visibleLogsQueryKey && visibleLogsLoading && !hasVisibleLogsSnapshot;

  const recordActivityQueryKey =
    viewerQueryKey &&
    hasCurrentViewerResult &&
    !visibleLogsAreLoading &&
    currentProfileId &&
    teamIds.length > 0 &&
    visibleLogIds.length > 0
      ? `${viewerQueryKey}:${currentProfileId}:${teamIdsKey}:${visibleLogIdsKey}:${manageableTeamIdsKey}`
      : undefined;

  const memberActivityQueryKey =
    viewerQueryKey && hasCurrentViewerResult && manageableTeamIds.length > 0
      ? `${viewerQueryKey}:${manageableTeamIdsKey}`
      : undefined;

  const recordActivitiesQuery = recordActivityQueryKey
    ? {
        activities: {
          $: {
            where: {
              // InstantDB types do not model relation-path filters here.
              'actor.id': { $ne: currentProfileId },
              'record.logId': { $in: visibleLogIds },
              teamId: { $in: teamIds },
              type: { $in: [...RECORD_REQUIRED_ACTIVITY_TYPES] },
            } as never,
            order: { date: 'desc' as const },
            limit: ACTIVITIES_PAGE_SIZE,
          },
          actor: activityActorQuery,
          record: activityRecordQuery,
          reply: activityReplyQuery,
          log: activityLogQuery,
        },
      }
    : (null as never);

  const memberActivitiesQuery = memberActivityQueryKey
    ? {
        activities: {
          $: {
            where: {
              teamId: { $in: manageableTeamIds },
              type: { $in: [...MEMBER_ACTIVITY_TYPES] },
            },
            order: { date: 'desc' as const },
            limit: ACTIVITIES_PAGE_SIZE,
          },
          actor: activityActorQuery,
          team: activityTeamQuery,
        },
      }
    : (null as never);

  const shouldQueryRecordActivities = recordActivitiesQuery !== null;
  const shouldQueryMemberActivities = memberActivitiesQuery !== null;

  const {
    data: recordActivitiesData,
    isLoading: recordActivitiesLoading,
    canLoadNextPage: canLoadQueriedNextPage,
    loadNextPage,
  } = db.useInfiniteQuery(recordActivitiesQuery);

  const { data: memberActivitiesData, isLoading: memberActivitiesLoading } =
    db.useQuery(memberActivitiesQuery);

  const { hasSnapshot: hasRecordActivitiesSnapshot, value: recordActivities } =
    useKeyedQueryCache({
      emptyValue: EMPTY_ACTIVITIES,
      queryKey: recordActivityQueryKey,
      value: recordActivitiesData?.activities as
        | ActivityWithRelations[]
        | undefined,
    });

  const { hasSnapshot: hasMemberActivitiesSnapshot, value: memberActivities } =
    useKeyedQueryCache({
      emptyValue: EMPTY_ACTIVITIES,
      queryKey: memberActivityQueryKey,
      value: memberActivitiesData?.activities as
        | ActivityWithRelations[]
        | undefined,
    });

  const activities = React.useMemo(
    () =>
      [...recordActivities, ...memberActivities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [memberActivities, recordActivities]
  );

  const canLoadActivitiesNextPage =
    shouldQueryRecordActivities &&
    hasRecordActivitiesSnapshot &&
    canLoadQueriedNextPage;

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage: canLoadActivitiesNextPage,
    itemCount: recordActivities.length,
    loadNextPage,
    requestKey: recordActivityQueryKey,
  });

  return {
    activities,
    canLoadNextPage: canLoadActivitiesNextPage,
    manageableTeamIds: manageableTeamIdsSet,
    isLoading:
      viewerIsLoading ||
      visibleLogsAreLoading ||
      (shouldQueryRecordActivities &&
        recordActivitiesLoading &&
        !hasRecordActivitiesSnapshot) ||
      (shouldQueryMemberActivities &&
        memberActivitiesLoading &&
        !hasMemberActivitiesSnapshot),
    loadNextPage: handleLoadNextPage,
  };
};
