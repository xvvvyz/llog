import { Text } from '@/components/ui/text';
import { GroupedActivity } from '@/utilities/group-activities';

export const ActivityItemName = ({ group }: { group: GroupedActivity }) => {
  const { type, activities } = group;
  const first = activities[0];
  const actor = first?.actor;

  if (type === 'reaction_added') {
    const uniqueActors = [...new Set(activities.map((a) => a.actor?.id))];
    const othersCount = uniqueActors.length - 1;

    return (
      <Text className="shrink text-sm leading-5" numberOfLines={1}>
        <Text className="text-sm leading-5 font-medium">{actor?.name}</Text>
        {othersCount > 0 && (
          <Text className="text-muted-foreground">{` +${othersCount}`}</Text>
        )}
      </Text>
    );
  }

  return (
    <Text className="shrink text-sm leading-5 font-medium" numberOfLines={1}>
      {actor?.name}
    </Text>
  );
};
