import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { SPECTRUM } from '@/theme/spectrum';
import { SearchResult } from '@/types/search';
import { Avatar } from '@/ui/avatar';
import { Text } from '@/ui/text';
import { Pressable, View } from 'react-native';

export const SearchResultLogCard = ({
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
        className="flex-row items-center justify-between rounded-2xl p-4"
        style={{
          backgroundColor: spectrum?.default,
          borderCurve: 'continuous',
        }}
      >
        <Text className="text-contrast-foreground flex-1" numberOfLines={1}>
          {result.text}
        </Text>
        {!!result.profiles?.length && (
          <View className="flex-row">
            {result.profiles.map((profile, index) => (
              <View className={cn(index > 0 && '-ml-[10px]')} key={profile.id}>
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
