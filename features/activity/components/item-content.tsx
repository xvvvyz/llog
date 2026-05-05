import { GroupedActivity } from '@/features/activity/lib/group-activities';
import { renderLinkifiedText } from '@/features/records/components/linkified-text';
import { groupReactionItems } from '@/features/records/lib/group-reaction-items';
import { REACTION_ICONS } from '@/features/records/lib/reaction-icons';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { isReactionEmoji } from '@/types/emoji';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const ItemContent = ({
  group,
  logColor,
}: {
  group: GroupedActivity;
  logColor: { lighter: string; default: string; darker: string } | null;
}) => {
  const { type, activities } = group;
  const first = activities[0];
  const recordText = trimDisplayText(first?.record?.text);
  const replyText = trimDisplayText(first?.reply?.text);

  switch (type) {
    case 'record_published': {
      return recordText ? (
        <Text className="-mt-1 px-4 web:text-pretty" numberOfLines={2}>
          {renderLinkifiedText({ text: recordText })}
        </Text>
      ) : null;
    }

    case 'reply_posted': {
      return replyText ? (
        <Text className="-my-1 px-4 web:text-pretty" numberOfLines={2}>
          {renderLinkifiedText({ text: replyText })}
        </Text>
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
                  className="text-muted-foreground"
                  color={logColor?.default}
                  icon={icon}
                  weight="fill"
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
