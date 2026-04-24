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
        className="flex-row p-4 rounded-2xl items-center justify-between"
        style={{
          backgroundColor: spectrum?.default,
          borderCurve: 'continuous',
        }}
      >
        <Text className="flex-1 text-contrast-foreground" numberOfLines={1}>
          {result.text}
        </Text>
        {!!result.profiles?.length && (
          <View className="flex-row">
            {result.profiles.map((profile, index) => (
              <View key={profile.id} className={cn(index > 0 && '-ml-[8px]')}>
                <Avatar
                  avatar={profile.uri}
                  className="border-border-secondary border"
                  id={profile.id}
                  seedId={profile.avatarSeedId}
                  size={18}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};
