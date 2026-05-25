import { renderRecordMarkdownText } from '@/features/records/components/record-markdown-text';
import * as trimDisplayText from '@/features/records/lib/trim-display-text';
import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import { type TextRef } from '@rn-primitives/types';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

export const TruncatedText = ({
  className,
  expandable = true,
  linkClassName,
  numberOfLines,
  text,
}: {
  className?: string;
  expandable?: boolean;
  linkClassName?: string;
  numberOfLines?: number;
  text: string;
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const [truncation, setTruncation] = React.useState({
    key: '',
    truncated: false,
  });

  const textRef = React.useRef<TextRef>(null);
  const displayText = trimDisplayText.trimDisplayText(text);

  const shouldUseWebNumberOfLines =
    Platform.OS === 'web' &&
    !expanded &&
    !!numberOfLines &&
    !trimDisplayText.hasExplicitLineBreaks(displayText);

  const collapsedPreview = shouldUseWebNumberOfLines
    ? { isLineTruncated: false, numberOfLines, text: displayText }
    : trimDisplayText.getCollapsedPreview({ numberOfLines, text: displayText });

  const collapsedNumberOfLines = expanded
    ? undefined
    : collapsedPreview.numberOfLines;

  const visibleText = expanded
    ? displayText
    : collapsedPreview.isLineTruncated
      ? `${collapsedPreview.text}…`
      : collapsedPreview.text;

  const truncationKey = `${numberOfLines ?? 'all'}:${displayText}`;

  const truncated =
    !expanded &&
    (collapsedPreview.isLineTruncated ||
      (truncation.key === truncationKey && truncation.truncated));

  React.useEffect(() => {
    if (!collapsedNumberOfLines || expanded) return;
    const node = textRef.current;
    if (!node) return;

    if (
      !('scrollHeight' in node) ||
      !('clientHeight' in node) ||
      typeof node.scrollHeight !== 'number' ||
      typeof node.clientHeight !== 'number'
    ) {
      return;
    }

    setTruncation({
      key: truncationKey,
      truncated: node.scrollHeight > node.clientHeight,
    });
  }, [collapsedNumberOfLines, expanded, truncationKey]);

  if (!displayText) return null;

  const renderedText = renderRecordMarkdownText({
    flattenListItems: shouldUseWebNumberOfLines,
    linkClassName,
    text: visibleText,
  });

  return (
    <View>
      <Text
        ref={textRef}
        className={cn('web:whitespace-pre-wrap web:text-pretty', className)}
        numberOfLines={collapsedNumberOfLines}
      >
        {renderedText}
      </Text>
      {expandable && truncated && !expanded && (
        <Pressable className="px-4" onPress={() => setExpanded(true)}>
          <Text
            className={cn('hover:underline', linkClassName ?? 'text-primary')}
          >
            Show more
          </Text>
        </Pressable>
      )}
    </View>
  );
};
