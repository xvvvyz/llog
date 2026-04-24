import { GroupedActivity } from '@/features/activity/lib/group-activities';
import { Text } from '@/ui/text';

export const ItemName = ({ group }: { group: GroupedActivity }) => {
  const { type, activities } = group;
  const first = activities[0];
  const actor = first?.actor;

  if (type === 'reaction_added') {
    const uniqueActors = [...new Set(activities.map((a) => a.actor?.id))];
    const othersCount = uniqueActors.length - 1;

    return (
      <Text className="leading-tight text-sm shrink" numberOfLines={1}>
        <Text className="font-medium leading-tight text-sm">{actor?.name}</Text>
        {othersCount > 0 && (
          <Text className="text-muted-foreground">{` +${othersCount}`}</Text>
        )}
      </Text>
    );
  }

  return (
    <Text
      className="font-medium leading-tight text-sm shrink"
      numberOfLines={1}
    >
      {actor?.name}
    </Text>
  );
};
