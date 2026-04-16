import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import LinkifyIt from 'linkify-it';
import * as React from 'react';
import { Linking, Platform } from 'react-native';
import tlds from 'tlds';

const linkify = new LinkifyIt().tlds(tlds);

export const renderLinkifiedText = ({
  color,
  text,
}: {
  color?: string;
  text: string;
}) => {
  const matches = linkify.match(text);
  if (!matches?.length) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const href = match.schema
      ? match.url
      : match.url.replace(/^http:\/\//, 'https://');

    const linkStyle = color ? { color } : undefined;

    if (Platform.OS === 'web') {
      parts.push(
        <Text
          asChild
          className={cn('underline', !color && 'text-primary')}
          key={`${href}-${index}`}
          style={linkStyle}
        >
          <a href={href} rel="noreferrer noopener" target="_blank">
            {match.text}
          </a>
        </Text>
      );
    } else {
      parts.push(
        <Text
          className={cn('underline', !color && 'text-primary')}
          key={`${href}-${index}`}
          onPress={() => Linking.openURL(href)}
          style={linkStyle}
        >
          {match.text}
        </Text>
      );
    }

    lastIndex = match.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
};
