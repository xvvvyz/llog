import { renderLinkifiedText } from '@/features/records/components/linkified-text';
import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import { type TextRef } from '@rn-primitives/types';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export const TruncatedText = ({
  className,
  color,
  numberOfLines,
  text,
}: {
  className?: string;
  color?: string;
  numberOfLines?: number;
  text: string;
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [truncated, setTruncated] = React.useState(false);
  const textRef = React.useRef<TextRef>(null);

  React.useEffect(() => {
    if (!numberOfLines || expanded) return;
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

    if (node.scrollHeight > node.clientHeight) setTruncated(true);
  }, [numberOfLines, expanded, text]);

  return (
    <View>
      <Text
        ref={textRef}
        className={className}
        numberOfLines={expanded ? undefined : numberOfLines}
      >
        {renderLinkifiedText({ color, text })}
      </Text>
      {truncated && !expanded && (
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
