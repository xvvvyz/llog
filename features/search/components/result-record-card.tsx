import { RecordTagChips } from '@/features/records/components/record-tag-chips';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { ResultHighlightedText } from '@/features/search/components/result-highlighted-text';
import { SearchResult } from '@/features/search/types/search';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate } from '@/lib/time';
import { SPECTRUM } from '@/theme/spectrum';
import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { Text } from '@/ui/text';
import { Pressable, View } from 'react-native';

export const ResultRecordCard = ({
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

  const displayText = trimDisplayText(result.text);

  const attachmentNames = result.attachmentNames?.filter(
    (name) => !!trimDisplayText(name)
  );

  const attachmentUrls = result.attachmentUrls?.filter(
    (url) => !!trimDisplayText(url)
  );

  const tagItems = result.tagItems?.filter(
    (tag) => !!trimDisplayText(tag.name ?? '')
  );

  return (
    <Pressable className={className} onPress={onPress}>
      <Card className="min-w-0 p-4 gap-3">
        <View className="flex-row gap-3 items-start">
          {result.author && (
            <Avatar
              avatar={result.author.image?.uri}
              className="border-border-secondary border"
              id={result.author.id}
              seedId={result.author.avatarSeedId}
              size={32}
            />
          )}
          <View className="flex-1 -mt-0.5">
            <View className="flex-row gap-2 items-baseline justify-between">
              {result.author && (
                <Text
                  className="font-medium leading-tight text-sm shrink"
                  numberOfLines={1}
                >
                  {result.author.name}
                </Text>
              )}
              {result.logName && (
                <View className="flex-1 flex-row min-w-32 gap-1 items-baseline justify-end">
                  <Text
                    className="leading-tight text-muted-foreground text-xs shrink-0"
                    numberOfLines={1}
                  >
                    {result.type === 'reply' ? 'Reply in' : 'Record in'}
                  </Text>
                  <View className="flex-row gap-1 items-center shrink">
                    <View
                      className="size-2.5 border-continuous rounded-[2px] shrink-0"
                      style={{ backgroundColor: logColor?.default }}
                    />
                    <Text
                      className="leading-tight text-muted-foreground text-xs shrink"
                      numberOfLines={1}
                    >
                      {result.logName}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {result.date && (
              <Text className="leading-tight text-muted-foreground text-xs">
                {formatDate(result.date)}
              </Text>
            )}
          </View>
        </View>
        {!!tagItems?.length && (
          <RecordTagChips className="w-full justify-start" tags={tagItems} />
        )}
        {!!displayText && (
          <ResultHighlightedText
            className="leading-tight text-muted-foreground text-sm web:text-pretty"
            highlightClassName="text-sm leading-tight font-medium text-foreground"
            numberOfLines={2}
            terms={result.textTerms ?? result.terms}
            text={displayText}
          />
        )}
        {!!(attachmentNames?.length || attachmentUrls?.length) && (
          <View className="min-w-0 gap-1">
            {attachmentNames?.map((name, index) => (
              <ResultHighlightedText
                key={`${name}:${index}`}
                className="min-w-0 leading-tight text-muted-foreground text-sm"
                highlightClassName="text-sm leading-tight font-medium text-foreground"
                numberOfLines={1}
                terms={result.attachmentTerms ?? result.terms}
                text={name}
              />
            ))}
            {attachmentUrls?.map((url, index) => (
              <ResultHighlightedText
                key={`${url}:${index}`}
                className="min-w-0 leading-tight text-muted-foreground text-sm"
                highlightClassName="text-sm leading-tight font-medium text-foreground"
                numberOfLines={1}
                terms={result.attachmentTerms ?? result.terms}
                text={url}
              />
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
};
