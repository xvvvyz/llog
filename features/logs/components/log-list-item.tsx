import { LogDropdownMenu } from '@/features/logs/components/log-dropdown-menu';
import { Tag } from '@/features/logs/types/log-tag';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
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
      <Link asChild href={`/${id}`} key={id}>
        <Button
          className="flex h-28 w-full flex-col items-start justify-between p-4 active:opacity-90"
          ripple="default"
          style={{ backgroundColor: color.default }}
          variant="ghost"
          wrapperClassName="rounded-2xl"
        >
          <View className="-mt-1.5 -ml-1.5 max-h-11 flex-row flex-wrap gap-0.5 overflow-hidden pr-10">
            {tags.map((tag) => (
              <View
                key={tag.id}
                className="bg-contrast-background/10 rounded-full px-1.5 py-0.5"
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
          <View className="w-full flex-row items-end justify-between gap-3">
            <Text
              className="text-contrast-foreground -mb-[5px] flex-1 leading-snug"
              numberOfLines={1}
            >
              {name}
            </Text>
            {profiles.length > 0 && (
              <View className="-mr-[6px] -mb-[6px] flex-row">
                {profiles.map((profile, i) => (
                  <View
                    className={cn(
                      'size-[24px] items-center justify-center overflow-hidden rounded-full p-px',
                      i > 0 && '-ml-[10px]'
                    )}
                    style={{ backgroundColor: color.default }}
                    key={profile.id}
                  >
                    <Avatar
                      avatar={profile.image?.uri}
                      className="opacity-90"
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
      <View className="absolute top-1.5 right-1.5">
        <LogDropdownMenu contentClassName="my-0 mr-2.5" id={id}>
          <View
            className="bg-contrast-foreground/15 web:transition-colors web:group-hover:bg-contrast-foreground/20 group-active:bg-contrast-foreground/20 size-6 items-center justify-center rounded-lg"
            style={{ borderCurve: 'continuous' }}
          >
            <Icon className="text-contrast-foreground" icon={DotsThree} />
          </View>
        </LogDropdownMenu>
      </View>
    </View>
  );
};
