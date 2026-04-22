import { SearchResultHighlightedText } from '@/features/search/search-result-highlighted-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate } from '@/lib/time';
import { SPECTRUM } from '@/theme/spectrum';
import { SearchResult } from '@/types/search';
import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { Text } from '@/ui/text';
import { Pressable, View } from 'react-native';

export const SearchResultRecordCard = ({
  className,
  onPress,
  result,
}: {
  className?: string;
  onPress: () => void;
  result: SearchResult;
}) => {
  const colorScheme = useColorScheme();

  const logColor =
    result.logColor != null
      ? SPECTRUM[colorScheme][result.logColor]
      : undefined;

  return (
    <Pressable className={className} onPress={onPress}>
      <Card className="gap-3 p-4">
        <View className="flex-row items-start gap-3">
          {result.author && (
            <Avatar
              avatar={result.author.image?.uri}
              id={result.author.id}
              seedId={result.author.avatarSeedId}
              size={36}
            />
          )}
          <View className="flex-1">
            <View className="flex-row items-baseline justify-between gap-2">
              {result.author && (
                <Text
                  className="shrink text-sm leading-tight font-medium"
                  numberOfLines={1}
                >
                  {result.author.name}
                </Text>
              )}
              {result.logName && (
                <View className="min-w-32 flex-1 flex-row items-baseline justify-end gap-1">
                  <Text
                    className="text-muted-foreground shrink-0 text-xs leading-tight"
                    numberOfLines={1}
                  >
                    {result.type === 'reply' ? 'Reply in' : 'Record in'}
                  </Text>
                  <View className="shrink flex-row items-center gap-1">
                    <View
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: logColor?.default }}
                    />
                    <Text
                      className="text-muted-foreground shrink text-xs leading-tight"
                      numberOfLines={1}
                    >
                      {result.logName}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {result.date && (
              <Text className="text-muted-foreground text-xs leading-tight">
                {formatDate(result.date)}
              </Text>
            )}
          </View>
        </View>
        {!!result.text && (
          <SearchResultHighlightedText
            className="text-muted-foreground text-sm leading-tight"
            highlightClassName="text-sm leading-tight font-medium text-foreground"
            numberOfLines={2}
            terms={result.terms}
            text={result.text}
          />
        )}
      </Card>
    </Pressable>
  );
};
