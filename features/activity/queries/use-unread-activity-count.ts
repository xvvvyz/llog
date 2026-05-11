import * as activityGroups from '@/features/activity/lib/group-activities';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

const UNREAD_ACTIVITY_LIMIT = 100;

const NEEDS_RECORD = new Set([
  'record_published',
  'reply_posted',
  'reaction_added',
]);

export const useUnreadActivityCount = ({
  lastReadDate,
  profileId,
}: {
  lastReadDate?: Date | number | string;
  profileId?: string;
}) => {
  const auth = db.useAuth();

  const { data: rolesData } = db.useQuery(
    auth.user && profileId
      ? {
          roles: {
            $: { fields: ['teamId' as const], where: { userId: auth.user.id } },
          },
        }
      : null
  );

  const rolesQueryKey = auth.user && profileId ? auth.user.id : undefined;
  const hasCurrentRolesResult = useCurrentQueryResult(rolesQueryKey, rolesData);

  const teamIds = React.useMemo(
    () =>
      hasCurrentRolesResult
        ? Array.from(
            new Set((rolesData?.roles ?? []).map((role) => role.teamId))
          ).filter((teamId): teamId is string => !!teamId)
        : [],
    [hasCurrentRolesResult, rolesData?.roles]
  );

  const teamIdsKey = teamIds.join(':');

  const activityQueryKey =
    profileId && teamIds.length > 0 ? `${profileId}:${teamIdsKey}` : undefined;

  const { data: activityData } = db.useQuery(
    activityQueryKey
      ? {
          activities: {
            $: {
              fields: ['date' as const, 'id' as const, 'type' as const],
              limit: UNREAD_ACTIVITY_LIMIT,
              order: { date: 'desc' as const },
              where: {
                teamId: { $in: teamIds },
                type: { $in: [...activityGroups.GROUPED_ACTIVITY_TYPES] },
              },
            },
            actor: { $: { fields: ['id' as const] } },
            record: { $: { fields: ['id' as const] } },
          },
        }
      : null
  );

  const hasCurrentActivityResult = useCurrentQueryResult(
    activityQueryKey,
    activityData
  );

  const activities =
    activityQueryKey && hasCurrentActivityResult
      ? (activityData?.activities ?? [])
      : [];

  if (!profileId) return 0;
  const lastReadDateKey = lastReadDate ? String(lastReadDate) : undefined;

  return activities.filter(
    (activity) =>
      activity.actor?.id !== profileId &&
      (!NEEDS_RECORD.has(activity.type) || activity.record?.id) &&
      (!lastReadDateKey || String(activity.date ?? '') > lastReadDateKey)
  ).length;
};
