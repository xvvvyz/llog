import { DropdownMenu } from '@/features/logs/components/dropdown-menu';
import type { FileItem } from '@/features/files/types/file';
import type { Profile } from '@/features/account/types/profile';
import * as lookup from '@/features/search/lib/lookup';
import { TagChipList } from '@/features/tags/components/tag-chip-list';
import { Tag } from '@/features/tags/types/tag';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Avatar } from '@/ui/avatar';
import { Icon } from '@/ui/icon';
import { nativePointerEvents } from '@/ui/pointer-events';
import { Text } from '@/ui/text';
import { Link } from 'expo-router';
import { DotsThree } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

type SearchableLogTag = Pick<Tag, 'id'> & { name?: string | null };

type ListItemProfile = Pick<Profile, 'avatarSeedId' | 'id' | 'name'> & {
  image?: Pick<FileItem, 'uri'>;
};

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
  color?: number | null;
  id: string;
  name: string;
  profiles: ListItemProfile[];
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
        className={cn(
          'relative overflow-hidden h-28 w-full border-continuous rounded-2xl',
          getSpectrumBackgroundClassName(color)
        )}
      >
        <Link asChild href={`/${id}`}>
          <Pressable
            accessibilityLabel={name}
            className="absolute inset-0 z-0 active:bg-white/10"
          />
        </Link>
        <View
          className="relative z-10 flex flex-col h-full w-full p-4 gap-0 items-start justify-between web:pointer-events-none"
          style={nativePointerEvents.boxNone}
        >
          <View className="relative z-20 -ml-1.5 -mt-1.5 w-full pr-6 web:pointer-events-auto">
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
            className="flex-row w-full gap-3 items-end justify-between web:pointer-events-none"
            style={nativePointerEvents.none}
          >
            <Text
              className="flex-1 -mb-1 min-w-0 leading-tight text-balance text-white web:-mb-1.5 web:pb-0.5 web:whitespace-normal"
              numberOfLines={titleLineCount}
            >
              {name}
            </Text>
            {profiles.length > 0 && (
              <View className="flex-row -mb-1.5 -mr-1.5">
                {profiles.map((profile, i) => (
                  <View
                    key={profile.id}
                    className={cn(
                      'size-avatar-stack-sm items-center justify-center overflow-hidden rounded-full p-px border-continuous',
                      getSpectrumBackgroundClassName(color),
                      i > 0 && '-ml-avatar-stack-sm-overlap'
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
        <View
          className="absolute right-0 top-0 z-20 web:pointer-events-none"
          style={nativePointerEvents.boxNone}
        >
          <DropdownMenu
            contentClassName="my-0 mr-2.5"
            id={id}
            triggerWrapperClassName="web:pointer-events-auto"
          >
            <View className="size-6 border-continuous rounded-lg bg-white/15 items-center justify-center group-active:bg-white/20 web:transition-colors web:group-hover:bg-white/20">
              <Icon className="text-white" icon={DotsThree} />
            </View>
          </DropdownMenu>
        </View>
      </View>
    </View>
  );
};
