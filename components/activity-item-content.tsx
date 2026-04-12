import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { REACTION_ICONS } from '@/types/emoji';
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
  const commentText = first?.comment?.text;

  switch (type) {
    case 'record_published': {
      return first?.record?.text ? (
        <Text className="px-4" numberOfLines={2}>
          {first.record.text}
        </Text>
      ) : null;
    }

    case 'comment_posted': {
      return commentText ? (
        <Text className="px-4" numberOfLines={2}>
          {commentText}
        </Text>
      ) : null;
    }

    case 'reaction_added': {
      const emojis = [
        ...new Set(activities.map((a) => a.emoji).filter(Boolean)),
      ];

      const reactionIcons = emojis
        .map((e) => REACTION_ICONS[e as keyof typeof REACTION_ICONS])
        .filter(Boolean);

      return reactionIcons.length > 0 ? (
        <View className="flex-row gap-1 px-4">
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
