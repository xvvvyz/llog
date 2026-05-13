import { DropdownMenu } from '@/features/logs/components/dropdown-menu';
import * as lookup from '@/features/search/lib/lookup';
import { TagChipList } from '@/features/tags/components/tag-chip-list';
import { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/avatar';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Link } from 'expo-router';
import { DotsThree } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

type SearchableLogTag = Pick<Tag, 'id'> & { name?: string | null };

const getTagSearchHref = (tag: SearchableLogTag) =>
  lookup.getLookupHref(lookup.getTagSearchQuery(tag));

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

  const moreTagsHref = lookup.getLookupHref(
    lookup.getLogSearchQuery({ id, name })
  );

  return (
    <View
      className={cn(
        'web:transition-opacity web:hover:opacity-90 w-full',
        className
      )}
    >
      <View
        className="relative overflow-hidden h-28 w-full border-continuous rounded-2xl"
        style={{ backgroundColor: color.default }}
      >
        <Link asChild href={`/${id}`}>
          <Pressable
            accessibilityLabel={name}
            className="absolute inset-0 z-0 active:bg-white/10"
          />
        </Link>
        <View
          className="relative z-10 flex flex-col h-full w-full p-4 gap-0 items-start justify-between"
          pointerEvents="box-none"
        >
          <View
            className="relative z-20 -ml-1.5 -mt-1.5 w-full pr-6"
            pointerEvents="auto"
          >
            <TagChipList
              chipClassName="max-w-full dark:bg-background"
              className="gap-0.5"
              getMoreHref={moreTagsHref ? () => moreTagsHref : undefined}
              getTagHref={getTagSearchHref}
              maxVisible={1}
              showEmpty
              tags={tags}
              textClassName="text-foreground"
            />
          </View>
          <View
            className="flex-row w-full gap-3 items-end justify-between"
            pointerEvents="none"
          >
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
        </View>
        <View className="absolute right-0 top-0 z-20" pointerEvents="box-none">
          <DropdownMenu contentClassName="my-0 mr-2.5" id={id}>
            <View className="size-6 border-continuous rounded-lg bg-white/15 items-center justify-center group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20">
              <Icon className="text-white" icon={DotsThree} />
            </View>
          </DropdownMenu>
        </View>
      </View>
    </View>
  );
};
