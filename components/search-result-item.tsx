import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SPECTRUM } from '@/theme/spectrum';
import { SearchResult } from '@/types/search';
import { formatDate } from '@/utilities/time';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const HighlightedText = ({
  text,
  terms,
  className,
  highlightClassName,
  numberOfLines,
}: {
  text: string;
  terms: string[];
  className?: string;
  highlightClassName?: string;
  numberOfLines?: number;
}) => {
  if (!terms.length) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
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

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const isMatch = pattern.test(part);
    pattern.lastIndex = 0;

    children.push(
      isMatch ? (
        <Text key={i} className={highlightClassName}>
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

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const SearchResultItem = ({
  className,
  result,
}: {
  className?: string;
  result: SearchResult;
}) => {
  const colorScheme = useColorScheme();

  const handlePress = () => {
    switch (result.type) {
      case 'log':
        router.push(`/${result.logId ?? result.id}`);
        break;
      case 'record':
        router.push(`/record/${result.id}`);
        break;
      case 'reply':
        if (result.recordId) router.push(`/record/${result.recordId}`);
        break;
    }
  };

  if (result.type === 'log') {
    const spectrum =
      result.logColor != null
        ? SPECTRUM[colorScheme][result.logColor]
        : undefined;

    return (
      <Pressable className={className} onPress={handlePress}>
        <View
          className="flex-row items-center justify-between rounded-2xl p-4"
          style={{
            backgroundColor: spectrum?.default,
            borderCurve: 'continuous',
          }}
        >
          <Text className="flex-1 text-white" numberOfLines={1}>
            {result.text}
          </Text>
          {!!result.profiles?.length && (
            <View className="flex-row">
              {result.profiles.map((profile, i) => (
                <View
                  key={profile.id}
                  style={i > 0 ? { marginLeft: -10 } : undefined}
                >
                  <Avatar avatar={profile.uri} id={profile.id} size={22} />
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  const logColor =
    result.logColor != null
      ? SPECTRUM[colorScheme][result.logColor]
      : undefined;

  return (
    <Pressable className={className} onPress={handlePress}>
      <Card className="gap-3 p-4">
        <View className="flex-row items-start gap-3">
          {result.author && (
            <Avatar
              avatar={result.author.image?.uri}
              id={result.author.id}
              size={34}
            />
          )}
          <View className="-mt-0.5 flex-1">
            <View className="flex-row items-baseline justify-between gap-2">
              {result.author && (
                <Text className="shrink text-sm font-medium" numberOfLines={1}>
                  {result.author.name}
                </Text>
              )}
              {result.logName && (
                <View className="min-w-32 flex-1 flex-row items-baseline justify-end gap-1">
                  <Text
                    className="shrink-0 text-xs text-muted-foreground"
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
                      className="shrink text-xs text-muted-foreground"
                      numberOfLines={1}
                    >
                      {result.logName}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {result.date && (
              <Text className="text-xs text-muted-foreground">
                {formatDate(result.date)}
              </Text>
            )}
          </View>
        </View>
        {!!result.text && (
          <HighlightedText
            className="text-sm text-muted-foreground"
            highlightClassName="text-sm font-medium text-foreground"
            numberOfLines={2}
            terms={result.terms}
            text={result.text}
          />
        )}
      </Card>
    </Pressable>
  );
};
