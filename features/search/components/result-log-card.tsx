import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { SearchResult } from '@/features/search/types/search';
import { TagChipList } from '@/features/tags/components/tag-chip-list';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
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
  const tags = (result.tagItems ?? []).filter((tag) =>
    trimDisplayText(tag.name)
  );

  return (
    <Pressable className={className} onPress={onPress}>
      <View
        className={cn(
          'flex flex-col overflow-hidden min-h-24 w-full p-4 border-continuous rounded-2xl justify-between',
          result.logColor != null &&
            getSpectrumBackgroundClassName(result.logColor)
        )}
      >
        <View className="-ml-1.5 -mt-1.5 w-full pr-6">
          {!!tags.length && (
            <TagChipList
              chipClassName="max-w-full dark:bg-background"
              className="gap-0.5"
              maxVisible={tags.length}
              tags={tags}
              textClassName="text-foreground"
            />
          )}
        </View>
        <View className="flex-row mt-4 w-full gap-3 items-end justify-between">
          <Text className="flex-1 -mb-1 min-w-0 leading-tight text-balance text-white web:whitespace-normal">
            {result.text}
          </Text>
          {!!result.profiles?.length && (
            <View className="flex-row -mb-1.5 -mr-1.5">
              {result.profiles.map((profile, index) => (
                <View
                  key={profile.id}
                  className={cn(
                    'size-avatar-stack-sm items-center justify-center overflow-hidden rounded-full p-px border-continuous',
                    result.logColor != null &&
                      getSpectrumBackgroundClassName(result.logColor),
                    index > 0 && '-ml-avatar-stack-sm-overlap'
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
      </View>
    </Pressable>
  );
};
