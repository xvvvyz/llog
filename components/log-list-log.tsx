import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';
import { Link } from 'expo-router';
import { View } from 'react-native';

export const LogListLog = ({
  color,
  id,
  name,
  tags,
}: {
  color: string;
  id: string;
  name: string;
  tags: InstaQLEntity<typeof schema, 'logTags'>[];
}) => {
  return (
    <View className="w-full p-1.5 web:transition-opacity web:hover:opacity-90 md:p-2">
      <Link asChild href={`/${id}`} key={id}>
        <Button
          className="flex h-28 w-full flex-col items-start justify-between p-4 active:opacity-90"
          ripple="default"
          style={{ backgroundColor: color }}
          variant="ghost"
          wrapperClassName="rounded-2xl"
        >
          <View className="max-h-11 flex-row flex-wrap gap-1 overflow-hidden pr-10">
            {tags.map((tag) => (
              <View
                key={tag.id}
                className="rounded-full bg-black/10 px-1.5 py-0.5"
              >
                <Text className="text-xs text-white/90" numberOfLines={1}>
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
          <Text className="-mb-1.5 text-white" numberOfLines={1}>
            {name}
          </Text>
        </Button>
      </Link>
      <View className="absolute right-1 top-1 md:right-1.5 md:top-1.5">
        <LogDropdownMenu id={id} />
      </View>
    </View>
  );
};
