import { SearchResult } from '@/features/search/types/search';
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

  return (
    <Pressable className={className} onPress={onPress}>
      <View
        className="flex-row p-4 border-continuous rounded-2xl items-center justify-between"
        style={{ backgroundColor: spectrum?.default }}
      >
        <Text className="flex-1 text-contrast-foreground" numberOfLines={1}>
          {result.text}
        </Text>
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
