import { Activity } from '@/types/activity';
import { Comment } from '@/types/comment';
import { Log } from '@/types/log';
import { Media } from '@/types/media';
import { Profile } from '@/types/profile';
import { Record as RecordType } from '@/types/record';
import { Team } from '@/types/team';

export type ActivityWithRelations = Activity & {
  actor?: Profile & { image?: Media; logs?: Pick<Log, 'id'>[] };
  comment?: Comment & { media?: Media[] };
  log?: Log;
  record?: RecordType & { media?: Media[] };
  team?: Team & { image?: Media };
};

export type GroupedActivity = {
  key: string;
  type: string;
  activities: ActivityWithRelations[];
  latestDate: number | string;
};

export const groupActivities = (
  activities: ActivityWithRelations[],
  currentProfileId?: string
): GroupedActivity[] => {
  const NEEDS_RECORD = new Set([
    'record_published',
    'comment_posted',
    'reaction_added',
  ]);

  const filtered = activities.filter(
    (a) =>
      a.actor?.id !== currentProfileId &&
      (!NEEDS_RECORD.has(a.type) || a.record)
  );

  const groups: GroupedActivity[] = [];

  for (const activity of filtered) {
    if (activity.type === 'reaction_added') {
      const lastGroup = groups[groups.length - 1];
      const targetId = activity.comment?.id ?? activity.record?.id;

      const lastTargetId =
        lastGroup?.type === 'reaction_added'
          ? (lastGroup.activities[0]?.comment?.id ??
            lastGroup.activities[0]?.record?.id)
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
