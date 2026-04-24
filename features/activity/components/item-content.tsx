import { GroupedActivity } from '@/features/activity/lib/group-activities';
import { renderLinkifiedText } from '@/features/records/components/linkified-text';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { REACTION_ICONS, isEmoji } from '@/types/emoji';
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
        <Text className="-my-1 px-4" numberOfLines={2}>
          {renderLinkifiedText({ text: recordText })}
        </Text>
      ) : null;
    }
    case 'reply_posted': {
      return replyText ? (
        <Text className="-my-1 px-4" numberOfLines={2}>
          {renderLinkifiedText({ text: replyText })}
        </Text>
      ) : null;
    }
    case 'reaction_added': {
      const emojis = [
        ...new Set(activities.map((a) => a.emoji).filter(Boolean)),
      ];

      const reactionIcons = emojis
        .filter(isEmoji)
        .map((emoji) => REACTION_ICONS[emoji])
        .filter(Boolean);

      return reactionIcons.length > 0 ? (
        <View className="flex-row -my-0.5 px-4 gap-1">
          {reactionIcons.map((icon, i) => (
            <Icon
              key={emojis[i]}
              className="text-muted-foreground"
              color={logColor?.default}
              icon={icon}
              weight="fill"
            />
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
