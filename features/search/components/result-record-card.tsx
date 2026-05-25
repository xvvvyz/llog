import { RecordTagChips } from '@/features/records/components/record-tag-chips';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import * as resultAttachmentPreview from '@/features/search/components/result-attachment-preview';
import { ResultHighlightedText } from '@/features/search/components/result-highlighted-text';
import { SearchResult } from '@/features/search/types/search';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
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

  const hasAttachmentPreview =
    resultAttachmentPreview.hasResultAttachmentPreview(result);

  const hasResultContent = hasMatchedText || hasAttachmentPreview;

  return (
    <Pressable className={className} onPress={onPress}>
      <Card className="min-w-0 gap-3.5">
        {!!tagItems?.length && (
          <View className="pt-4 px-4">
            <RecordTagChips className="w-full justify-start" tags={tagItems} />
          </View>
        )}
        <View
          className={cn(
            'flex-row px-4 gap-2.5 items-center',
            tagItems?.length ? 'pt-0' : 'pt-4',
            !hasResultContent && 'pb-4'
          )}
        >
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
                    className={cn(
                      'size-2.5 border-continuous rounded-xs shrink-0',
                      result.logColor != null &&
                        getSpectrumBackgroundClassName(result.logColor)
                    )}
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
        {hasResultContent && (
          <View className="min-w-0 pb-4 px-4">
            <View className="min-w-0 gap-3.5">
              {hasMatchedText && (
                <View className="min-w-0 gap-1.5">
                  {!!displayText && (
                    <ResultHighlightedText
                      className="-my-0.5 min-w-0 leading-tight text-muted-foreground text-sm web:text-pretty"
                      highlightClassName="font-medium text-foreground text-sm"
                      numberOfLines={2}
                      terms={result.textTerms ?? result.terms}
                      text={displayText}
                    />
                  )}
                  {attachmentNames?.map((name, index) => (
                    <ResultHighlightedText
                      key={`${name}:${index}`}
                      className="-my-0.5 min-w-0 leading-tight text-muted-foreground text-sm"
                      highlightClassName="font-medium text-foreground text-sm"
                      numberOfLines={1}
                      terms={result.attachmentTerms ?? result.terms}
                      text={name}
                    />
                  ))}
                  {attachmentUrls?.map((url, index) => (
                    <ResultHighlightedText
                      key={`${url}:${index}`}
                      className="-my-0.5 min-w-0 leading-tight text-muted-foreground text-sm"
                      highlightClassName="font-medium text-foreground text-sm"
                      numberOfLines={1}
                      terms={result.attachmentTerms ?? result.terms}
                      text={url}
                    />
                  ))}
                  {mediaSnippets?.map((snippet, index) => (
                    <ResultHighlightedText
                      key={`${snippet}:${index}`}
                      className="-my-0.5 min-w-0 leading-tight text-muted-foreground text-sm"
                      highlightClassName="font-medium text-foreground text-sm"
                      numberOfLines={1}
                      terms={result.mediaTerms ?? result.terms}
                      text={snippet}
                    />
                  ))}
                </View>
              )}
              {hasAttachmentPreview && (
                <resultAttachmentPreview.ResultAttachmentPreview
                  files={result.files}
                  links={result.links}
                />
              )}
            </View>
          </View>
        )}
      </Card>
    </Pressable>
  );
};
