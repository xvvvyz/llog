import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { SearchResult } from '@/features/search/types/search';
import { TagChipList } from '@/features/tags/components/tag-chip-list';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { SPECTRUM } from '@/theme/spectrum';
import { Avatar } from '@/ui/avatar';
import { Text } from '@/ui/text';
import { Pressable, View } from 'react-native';

export const ResultLogCard = ({
  className,
  onPress,
  result,
}: {
  className?: string;
  onPress: () => void;
  result: SearchResult;
}) => {
  const colorScheme = useColorScheme();

  const spectrum =
    result.logColor != null
      ? SPECTRUM[colorScheme][result.logColor]
      : undefined;

  const tags = (result.tagItems ?? []).filter((tag) =>
    trimDisplayText(tag.name)
  );

  return (
    <Pressable className={className} onPress={onPress}>
      <View
        className="flex-row p-4 border-continuous rounded-2xl items-center justify-between"
        style={{ backgroundColor: spectrum?.default }}
      >
        <View className="flex-1 flex-row min-w-0 gap-4 items-center">
          <Text className="text-white shrink" numberOfLines={1}>
            {result.text}
          </Text>
          {!!tags.length && (
            <TagChipList
              chipClassName="max-w-full dark:bg-background"
              className="flex-1 min-w-0 gap-0.5"
              maxVisible={tags.length}
              tags={tags}
              textClassName="text-foreground"
            />
          )}
        </View>
        {!!result.profiles?.length && (
          <View className="flex-row -mr-[6px] ml-3">
            {result.profiles.map((profile, index) => (
              <View
                key={profile.id}
                style={{ backgroundColor: spectrum?.default }}
                className={cn(
                  'size-[24px] items-center justify-center overflow-hidden rounded-full p-px border-continuous',
                  index > 0 && '-ml-[10px]'
                )}
              >
                <Avatar
                  avatar={profile.uri}
                  id={profile.id}
                  seedId={profile.avatarSeedId}
                  size={22}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};
