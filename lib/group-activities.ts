import { Activity } from '@/types/activity';
import { Log } from '@/types/log';
import { Media } from '@/types/media';
import { Profile } from '@/types/profile';
import { Record as RecordType } from '@/types/record';
import { Reply } from '@/types/reply';
import { Team } from '@/types/team';

export type ActivityWithRelations = Activity & {
  actor?: Profile & { image?: Media; logs?: Pick<Log, 'id'>[] };
  reply?: Reply & { media?: Media[] };
  log?: Log;
  record?: RecordType & { media?: Media[] };
  team?: Team & { image?: Media };
};

export const GROUPED_ACTIVITY_TYPES = [
  'member_joined',
  'member_left',
  'reaction_added',
  'record_published',
  'reply_posted',
] as const;

export type GroupedActivityType = (typeof GROUPED_ACTIVITY_TYPES)[number];

export type GroupedActivity = {
  key: string;
  type: GroupedActivityType;
  activities: [ActivityWithRelations, ...ActivityWithRelations[]];
  latestDate: number | string;
};

const isGroupedActivityType = (value: string): value is GroupedActivityType =>
  GROUPED_ACTIVITY_TYPES.some((type) => type === value);

export const groupActivities = (
  activities: ActivityWithRelations[],
  currentProfileId?: string
): GroupedActivity[] => {
  const NEEDS_RECORD = new Set([
    'record_published',
    'reply_posted',
    'reaction_added',
  ]);

  const filtered = activities.filter(
    (a) =>
      a.actor?.id !== currentProfileId &&
      (!NEEDS_RECORD.has(a.type) || a.record)
  );

  const groups: GroupedActivity[] = [];

  for (const activity of filtered) {
    if (!isGroupedActivityType(activity.type)) continue;

    if (activity.type === 'reaction_added') {
      const lastGroup = groups[groups.length - 1];
      const targetId = activity.reply?.id ?? activity.record?.id;

      const lastTargetId =
        lastGroup?.type === 'reaction_added'
          ? (lastGroup.activities[0].reply?.id ??
            lastGroup.activities[0].record?.id)
          : undefined;

      if (lastGroup?.type === 'reaction_added' && targetId === lastTargetId) {
        lastGroup.activities.push(activity);
        continue;
      }
    }

    groups.push({
      key: activity.id,
      type: activity.type,
      activities: [activity],
      latestDate: activity.date,
    });
  }

  return groups;
};
