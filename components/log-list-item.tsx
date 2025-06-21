import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import schema from '@/instant.schema';
import { cn } from '@/utilities/ui/utils';
import { InstaQLEntity } from '@instantdb/react-native';
import { Link } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';
import { View } from 'react-native';

export const LogListItem = ({
  className,
  color,
  id,
  name,
  tags,
}: {
  className?: string;
  color: string;
  id: string;
  name: string;
  tags: InstaQLEntity<typeof schema, 'logTags'>[];
}) => {
  return (
    <View
      className={cn(
        'w-full web:transition-opacity web:hover:opacity-90',
        className
      )}
    >
      <Link asChild href={`/${id}`} key={id}>
        <Button
          className="flex h-28 w-full flex-col items-start justify-between p-4 active:opacity-90"
          ripple="default"
          style={{ backgroundColor: color }}
          variant="ghost"
          wrapperClassName="rounded-xl"
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
          <Text className="-mb-1 text-white" numberOfLines={1}>
            {name}
          </Text>
        </Button>
      </Link>
      <View className="absolute right-1.5 top-1.5">
        <LogDropdownMenu contentClassName="mr-1.5" id={id}>
          <View
            className="size-6 items-center justify-center rounded-lg bg-white/15 group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20"
            style={{ borderCurve: 'continuous' }}
          >
            <Icon className="text-white" icon={MoreHorizontal} size={20} />
          </View>
        </LogDropdownMenu>
      </View>
    </View>
  );
};
