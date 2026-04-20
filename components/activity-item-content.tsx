import { renderLinkifiedText } from '@/components/linkified-text';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { REACTION_ICONS, isEmoji } from '@/types/emoji';
import { GroupedActivity } from '@/utilities/group-activities';
import { View } from 'react-native';

export const ActivityItemContent = ({
  group,
  logColor,
}: {
  group: GroupedActivity;
  logColor: { lighter: string; default: string; darker: string } | null;
}) => {
  const { type, activities } = group;
  const first = activities[0];
  const replyText = first?.reply?.text;

  switch (type) {
    case 'record_published': {
      return first?.record?.text ? (
        <Text className="-my-1 px-4" numberOfLines={2}>
          {renderLinkifiedText({ text: first.record.text })}
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
        <View className="-my-0.5 flex-row gap-1 px-4">
          {reactionIcons.map((icon, i) => (
            <Icon
              key={emojis[i]}
              className="text-muted-foreground"
              icon={icon}
              style={logColor ? { color: logColor.default } : undefined}
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
