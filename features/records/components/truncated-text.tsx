import { renderRecordMarkdownText } from '@/features/records/components/record-markdown-text';
import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import { type TextRef } from '@rn-primitives/types';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as trimDisplayText from '@/features/records/lib/trim-display-text';

const COLLAPSED_LINE_HEIGHT = 24;

export const TruncatedText = ({
  className,
  color,
  expandable = true,
  numberOfLines,
  text,
}: {
  className?: string;
  color?: string;
  expandable?: boolean;
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

  const shouldUseVisualClip =
    Platform.OS === 'web' &&
    !expanded &&
    !!numberOfLines &&
    trimDisplayText.hasExplicitLineBreaks(displayText);

  const collapsedPreview = shouldUseVisualClip
    ? { isLineTruncated: false, numberOfLines: undefined, text: displayText }
    : trimDisplayText.getCollapsedPreview({ numberOfLines, text: displayText });

  const collapsedNumberOfLines = expanded
    ? undefined
    : collapsedPreview.numberOfLines;

  const visibleText = expanded ? displayText : collapsedPreview.text;
  const truncationKey = `${numberOfLines ?? 'all'}:${displayText}`;

  const visualClipStyle = shouldUseVisualClip
    ? ({
        display: 'block',
        maxHeight: (numberOfLines ?? 0) * COLLAPSED_LINE_HEIGHT,
        overflow: 'hidden',
      } as unknown as React.ComponentProps<typeof Text>['style'])
    : undefined;

  const truncated =
    !expanded &&
    (collapsedPreview.isLineTruncated ||
      (truncation.key === truncationKey && truncation.truncated));

  React.useEffect(() => {
    if ((!collapsedNumberOfLines && !shouldUseVisualClip) || expanded) return;
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
  }, [collapsedNumberOfLines, expanded, shouldUseVisualClip, truncationKey]);

  if (!displayText) return null;

  return (
    <View>
      <Text
        ref={textRef}
        className={cn('web:whitespace-pre-wrap web:text-pretty', className)}
        numberOfLines={collapsedNumberOfLines}
        style={visualClipStyle}
      >
        {renderRecordMarkdownText({ color, text: visibleText })}
      </Text>
      {expandable && truncated && !expanded && (
        <Pressable className="px-4" onPress={() => setExpanded(true)}>
          <Text
            className={cn(!color && 'text-primary', 'hover:underline')}
            style={color ? { color } : undefined}
          >
            Show more
          </Text>
        </Pressable>
      )}
    </View>
  );
};
