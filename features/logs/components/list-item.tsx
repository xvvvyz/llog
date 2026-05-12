import { DropdownMenu } from '@/features/logs/components/dropdown-menu';
import { TagChipList } from '@/features/tags/components/tag-chip-list';
import { Tag } from '@/features/tags/types/tag';
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
  const titleLineCount = tags.length <= 1 ? 3 : 2;

  return (
    <View
      className={cn(
        'web:transition-opacity web:hover:opacity-90 w-full',
        className
      )}
    >
      <Link key={id} asChild href={`/${id}`}>
        <Button
          className="flex flex-col h-28 w-full p-4 gap-0 items-start justify-between active:opacity-90"
          pressOnWebTouchRelease={false}
          ripple="default"
          style={{ backgroundColor: color.default }}
          variant="ghost"
          wrapperClassName="rounded-2xl border-continuous"
        >
          <TagChipList
            chipClassName="max-w-full dark:bg-background"
            className="-ml-1.5 -mt-1.5 w-full pr-6 gap-0.5"
            maxVisible={1}
            showEmpty
            tags={tags}
            textClassName="text-foreground"
          />
          <View className="flex-row w-full gap-3 items-end justify-between">
            <Text
              className="flex-1 -mb-[5px] min-w-0 leading-tight text-balance text-white web:whitespace-normal"
              numberOfLines={titleLineCount}
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
                      'size-[24px] items-center justify-center overflow-hidden rounded-full p-px border-continuous',
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
          <View className="size-6 border-continuous rounded-lg bg-white/15 items-center justify-center group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20">
            <Icon className="text-white" icon={DotsThree} />
          </View>
        </DropdownMenu>
      </View>
    </View>
  );
};
