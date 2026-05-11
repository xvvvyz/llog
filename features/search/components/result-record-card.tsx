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

const RESULT_TEXT_CLASS_NAME =
  'min-w-0 leading-tight text-muted-foreground text-sm';

const RESULT_HIGHLIGHT_CLASS_NAME =
  'text-sm leading-tight font-medium text-foreground';

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

  const mediaSnippets = result.mediaSnippets?.filter(
    (snippet) => !!trimDisplayText(snippet)
  );

  const activityLabel =
    result.type === 'reply'
      ? `replied${result.logName ? ' in' : ''}`
      : `recorded${result.logName ? ' in' : ''}`;

  const hasMatchedText = !!(
    displayText ||
    attachmentNames?.length ||
    attachmentUrls?.length ||
    mediaSnippets?.length
  );

  return (
    <Pressable className={className} onPress={onPress}>
      <Card className="min-w-0 p-4 gap-3">
        <View className="flex-row gap-2.5 items-center">
          {result.author && (
            <Avatar
              avatar={result.author.image?.uri}
              className="border-border-secondary border"
              id={result.author.id}
              seedId={result.author.avatarSeedId}
              size={32}
            />
          )}
          <View className="flex-1">
            <View className="flex-row gap-1 items-center">
              <Text className="text-xs shrink" numberOfLines={1}>
                {result.author?.name}
                <Text className="text-muted-foreground text-xs">
                  {result.author?.name ? ' ' : ''}
                  {activityLabel}
                </Text>
              </Text>
              {result.logName && (
                <View className="flex-row gap-1 items-center shrink">
                  <View
                    className="size-2.5 border-continuous rounded-[2px] shrink-0"
                    style={{ backgroundColor: logColor?.default }}
                  />
                  <Text className="text-xs shrink" numberOfLines={1}>
                    {result.logName}
                  </Text>
                </View>
              )}
            </View>
            {result.date && (
              <Text className="text-muted-foreground text-xs">
                {formatDate(result.date)}
              </Text>
            )}
          </View>
        </View>
        {!!tagItems?.length && (
          <RecordTagChips className="w-full justify-start" tags={tagItems} />
        )}
        {hasMatchedText && (
          <View className="min-w-0 gap-1.5">
            {!!displayText && (
              <ResultHighlightedText
                className="min-w-0 leading-tight text-muted-foreground text-sm web:text-pretty"
                highlightClassName={RESULT_HIGHLIGHT_CLASS_NAME}
                numberOfLines={2}
                terms={result.textTerms ?? result.terms}
                text={displayText}
              />
            )}
            {attachmentNames?.map((name, index) => (
              <ResultHighlightedText
                key={`${name}:${index}`}
                className={RESULT_TEXT_CLASS_NAME}
                highlightClassName={RESULT_HIGHLIGHT_CLASS_NAME}
                numberOfLines={1}
                terms={result.attachmentTerms ?? result.terms}
                text={name}
              />
            ))}
            {attachmentUrls?.map((url, index) => (
              <ResultHighlightedText
                key={`${url}:${index}`}
                className={RESULT_TEXT_CLASS_NAME}
                highlightClassName={RESULT_HIGHLIGHT_CLASS_NAME}
                numberOfLines={1}
                terms={result.attachmentTerms ?? result.terms}
                text={url}
              />
            ))}
            {mediaSnippets?.map((snippet, index) => (
              <ResultHighlightedText
                key={`${snippet}:${index}`}
                className={RESULT_TEXT_CLASS_NAME}
                highlightClassName={RESULT_HIGHLIGHT_CLASS_NAME}
                numberOfLines={1}
                terms={result.mediaTerms ?? result.terms}
                text={snippet}
              />
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
};
