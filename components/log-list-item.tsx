import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tag } from '@/types/log-tag';
import { cn } from '@/utilities/cn';
import { Link } from 'expo-router';
import { DotsThree } from 'phosphor-react-native/lib/module/icons/DotsThree';
import { View } from 'react-native';

export const LogListItem = ({
  className,
  color,
  id,
  name,
  profiles,
  tags,
}: {
  className?: string;
  color: string;
  id: string;
  name: string;
  profiles: { id: string; name: string; image?: { uri: string } }[];
  tags: Tag[];
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
          wrapperClassName="rounded-2xl"
        >
          <View className="-ml-1.5 -mt-1.5 max-h-11 flex-row flex-wrap gap-0.5 overflow-hidden pr-10">
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
          <View className="w-full flex-row items-end justify-between gap-3">
            <Text
              className="-mb-[5px] flex-1 leading-snug text-white"
              numberOfLines={1}
            >
              {name}
            </Text>
            {profiles.length > 0 && (
              <View
                className="flex-row"
                style={{ marginBottom: -5, marginRight: -5 }}
              >
                {profiles.map((profile, i) => (
                  <View
                    key={profile.id}
                    className="rounded-full"
                    style={[
                      { width: 22, height: 22 },
                      i > 0 ? { marginLeft: -10 } : undefined,
                    ]}
                  >
                    <Avatar
                      avatar={profile.image?.uri}
                      id={profile.id}
                      size={22}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </Button>
      </Link>
      <View className="absolute right-1.5 top-1.5">
        <LogDropdownMenu contentClassName="my-0 mr-2.5" id={id}>
          <View
            className="size-6 items-center justify-center rounded-lg bg-white/15 group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20"
            style={{ borderCurve: 'continuous' }}
          >
            <Icon className="text-white" icon={DotsThree} />
          </View>
        </LogDropdownMenu>
      </View>
    </View>
  );
};
