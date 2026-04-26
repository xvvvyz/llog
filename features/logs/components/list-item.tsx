import { DropdownMenu } from '@/features/logs/components/dropdown-menu';
import { Tag } from '@/features/logs/types/tag';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Link } from 'expo-router';
import { DotsThree } from 'phosphor-react-native';
import { View } from 'react-native';

export const ListItem = ({
  className,
  color,
  id,
  name,
  profiles,
  tags,
}: {
  className?: string;
  color: { darker: string; default: string; lighter: string };
  id: string;
  name: string;
  profiles: {
    avatarSeedId?: string;
    id: string;
    name: string;
    image?: { uri: string };
  }[];
  tags: Tag[];
}) => {
  return (
    <View
      className={cn(
        'web:transition-opacity web:hover:opacity-90 w-full',
        className
      )}
    >
      <Link key={id} asChild href={`/${id}`}>
        <Button
          className="flex flex-col h-28 w-full p-4 items-start justify-between active:opacity-90"
          pressOnWebTouchRelease={false}
          ripple="default"
          style={{ backgroundColor: color.default }}
          variant="ghost"
          wrapperClassName="rounded-2xl"
        >
          <View className="flex-row flex-wrap overflow-hidden -ml-1.5 -mt-1.5 max-h-11 pr-10 gap-0.5">
            {tags.map((tag) => (
              <View
                key={tag.id}
                className="px-1.5 py-0.5 rounded-full bg-contrast-background/10"
              >
                <Text
                  className="text-contrast-foreground/90 text-xs"
                  numberOfLines={1}
                >
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex-row w-full gap-3 items-end justify-between">
            <Text
              className="flex-1 -mb-[5px] leading-snug text-contrast-foreground"
              numberOfLines={1}
            >
              {name}
            </Text>
            {profiles.length > 0 && (
              <View className="flex-row -mb-[6px] -mr-[6px]">
                {profiles.map((profile, i) => (
                  <View
                    key={profile.id}
                    style={{ backgroundColor: color.default }}
                    className={cn(
                      'size-[24px] items-center justify-center overflow-hidden rounded-full p-px',
                      i > 0 && '-ml-[10px]'
                    )}
                  >
                    <Avatar
                      avatar={profile.image?.uri}
                      id={profile.id}
                      seedId={profile.avatarSeedId}
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
        <DropdownMenu contentClassName="my-0 mr-2.5" id={id}>
          <View
            className="size-6 rounded-lg bg-contrast-foreground/15 items-center justify-center group-active:bg-contrast-foreground/20 web:transition-colors web:group-hover:bg-contrast-foreground/20"
            style={{ borderCurve: 'continuous' }}
          >
            <Icon className="text-contrast-foreground" icon={DotsThree} />
          </View>
        </DropdownMenu>
      </View>
    </View>
  );
};
