import { isReactionEmoji } from '@/domain/records/reactions';
import { GroupedActivity } from '@/features/activity/lib/group-activities';
import { TruncatedText } from '@/features/records/components/truncated-text';
import { groupReactionItems } from '@/features/records/lib/group-reaction-items';
import { REACTION_ICONS } from '@/features/records/lib/reaction-icons';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui/icon';
import { View } from 'react-native';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

const ACTIVITY_TEXT_LINES = 2;

export const ItemContent = ({
  group,
  logColorIndex,
}: {
  group: GroupedActivity;
  logColorIndex?: number | null;
}) => {
  const { type, activities } = group;
  const first = activities[0];
  const recordText = trimDisplayText(first?.record?.text);
  const replyText = trimDisplayText(first?.reply?.text);

  switch (type) {
    case 'record_published': {
      return recordText ? (
        <ActivityText text={recordText} variant="record" />
      ) : null;
    }

    case 'reply_posted': {
      return replyText ? (
        <ActivityText text={replyText} variant="reply" />
      ) : null;
    }

    case 'reaction_added': {
      const emojis = [
        ...new Set(activities.map((a) => a.emoji).filter(Boolean)),
      ];

      const reactionIcons = emojis
        .filter(isReactionEmoji)
        .map((emoji) => ({ emoji, icon: REACTION_ICONS[emoji] }))
        .filter(Boolean);

      const reactionGroups = groupReactionItems(reactionIcons);

      return reactionIcons.length > 0 ? (
        <View className="flex-row flex-wrap -my-0.5 px-4">
          {reactionGroups.map((group) => (
            <View
              key={group.map(({ emoji }) => emoji).join('-')}
              className="flex-row gap-3"
            >
              {group.map(({ emoji, icon }) => (
                <Icon
                  key={emoji}
                  icon={icon}
                  weight="fill"
                  className={
                    logColorIndex != null
                      ? spectrumClassNames.getSpectrumTextClassName(
                          logColorIndex
                        )
                      : 'text-muted-foreground'
                  }
                />
              ))}
            </View>
          ))}
        </View>
      ) : null;
    }

    case 'member_joined': {
      return null;
    }

    default: {
      return null;
    }
  }
};

const ActivityText = ({
  text,
  variant,
}: {
  text: string;
  variant: 'record' | 'reply';
}) => (
  <TruncatedText
    className={cn(variant === 'record' ? '-mt-1' : '-my-1', 'px-4')}
    expandable={false}
    numberOfLines={ACTIVITY_TEXT_LINES}
    text={text}
  />
);
