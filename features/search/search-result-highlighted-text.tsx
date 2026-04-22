import { Text } from '@/ui/text';
import * as React from 'react';

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const SearchResultHighlightedText = ({
  className,
  highlightClassName,
  numberOfLines,
  terms,
  text,
}: {
  className?: string;
  highlightClassName?: string;
  numberOfLines?: number;
  terms: string[];
  text: string;
}) => {
  const pattern = React.useMemo(() => {
    if (!terms.length) return null;
    return new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  }, [terms]);

  if (!pattern) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const firstMatch = text.search(pattern);

  let displayText = text;
  let prefix = '';

  if (firstMatch > 30) {
    const cutPoint = text.lastIndexOf(' ', firstMatch - 5);
    displayText = text.slice(cutPoint > 0 ? cutPoint + 1 : firstMatch - 20);
    prefix = '\u2026 ';
  }

  const parts = displayText.split(pattern);
  const children: React.ReactNode[] = [];

  if (prefix) {
    children.push(
      <Text key="prefix" className="text-muted-foreground">
        {prefix}
      </Text>
    );
  }

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (!part) continue;

    const isMatch = pattern.test(part);
    pattern.lastIndex = 0;

    children.push(
      isMatch ? (
        <Text key={index} className={highlightClassName}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  }

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};
