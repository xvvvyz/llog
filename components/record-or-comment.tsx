import { EmojiPicker } from '@/components/emoji-picker';
import { Reactions } from '@/components/reactions';
import { AudioPlaylist } from '@/components/ui/audio-player';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { useLogColor } from '@/hooks/use-log-color';
import { Comment } from '@/types/comment';
import { Media } from '@/types/media';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { Record as RecordType } from '@/types/record';
import { cn } from '@/utilities/cn';
import { formatDate } from '@/utilities/time';
import { Link, router } from 'expo-router';
import { ChatCircleDots } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

export const RecordOrComment = ({
  className,
  commentId,
  logId,
  numberOfLines,
  record,
  recordId: recordIdProp,
  variant,
}: {
  className?: string;
  commentId?: string;
  logId?: string;
  numberOfLines?: number;
  record: Partial<
    (RecordType | Comment) & {
      author: Profile & { image?: Media };
      comments: Pick<Comment, 'id'>[];
      media: Media[];
      reactions: (Reaction & { author?: Pick<Profile, 'id'> })[];
    }
  >;
  recordId?: string;
  variant?: 'compact';
}) => {
  const colorScheme = useColorScheme();
  const logColor = useLogColor({ id: logId });
  const accentColor = logColor?.[colorScheme === 'dark' ? 'lighter' : 'darker'];
  const recordId = recordIdProp ?? record.id ?? '';

  const { audioMedia, imageMedia } = useFilteredMedia(record.media || []);

  const idIndexMap = useMemo(
    () =>
      imageMedia.reduce(
        (acc, image, index) => {
          acc[image.id] = index;
          return acc;
        },
        {} as Record<string, number>
      ),
    [imageMedia]
  );

  const renderImage = useCallback(
    (image: Media, height: number) => {
      return (
        <Pressable
          className="flex-1"
          key={image.id}
          onPress={() =>
            router.push({
              pathname: `/record/[recordId]/media`,
              params: {
                recordId: recordId || record.id!,
                ...(commentId && { commentId }),
                defaultIndex: String(idIndexMap[image.id]),
              },
            })
          }
        >
          <Image
            contentFit="cover"
            height={height}
            maintainAspectRatio={false}
            uri={image.uri}
            wrapperClassName="rounded-2xl"
          />
        </Pressable>
      );
    },
    [commentId, idIndexMap, record.id, recordId]
  );

  const cardImageHeight = imageMedia.length < 4 ? 250 : 124;
  const compactImageHeight = imageMedia.length < 4 ? 220 : 110;

  if (variant === 'compact') {
    return (
      <View
        className={cn(
          'border-t border-border-secondary px-4 pb-3 pt-4',
          className
        )}
      >
        <View className="flex-row gap-3">
          <Avatar avatar={record.author?.image?.uri} id={record.author?.id} />
          <View className="flex-1">
            <View className="flex-row items-baseline gap-2">
              <Text className="font-medium leading-5">
                {record.author?.name}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {formatDate(record.date)}
              </Text>
            </View>
            {!!record.text && (
              <TruncatedText
                className="select-text"
                color={accentColor}
                numberOfLines={numberOfLines}
                text={record.text}
              />
            )}
            {!!imageMedia.length && (
              <View className="mt-4 gap-0.5">
                <View className="flex-row gap-0.5">
                  {imageMedia
                    .slice(0, 3)
                    .map((image) => renderImage(image, compactImageHeight))}
                </View>
                {imageMedia.length > 3 && (
                  <View className="flex-row gap-0.5">
                    {imageMedia
                      .slice(3, 5)
                      .map((image) => renderImage(image, compactImageHeight))}
                  </View>
                )}
              </View>
            )}
            {audioMedia.length > 0 && (
              <View className="mt-4 gap-2">
                <AudioPlaylist clips={audioMedia} />
              </View>
            )}
            <View className="mt-3 flex-row items-center gap-1.5">
              <EmojiPicker
                color={accentColor}
                commentId={commentId}
                reactions={record.reactions}
                recordId={recordId}
              />
              {!!record.reactions?.length && (
                <View className="flex-row items-center">
                  <Reactions
                    color={accentColor}
                    commentId={commentId}
                    reactions={record.reactions}
                    recordId={recordId}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Card className={cn('gap-4', className)}>
      <View className="flex-row items-center gap-3 p-4 pb-0">
        <Avatar avatar={record.author?.image?.uri} id={record.author?.id} />
        <View>
          <Text className="font-medium leading-5">{record.author?.name}</Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatDate(record.date)}
          </Text>
        </View>
      </View>
      {!!record.text && (
        <TruncatedText
          className="select-text px-4"
          color={accentColor}
          numberOfLines={numberOfLines}
          text={record.text}
        />
      )}
      {!!imageMedia.length && (
        <View className="gap-0.5">
          <View className="flex-row gap-0.5">
            {imageMedia
              .slice(0, 3)
              .map((image) => renderImage(image, cardImageHeight))}
          </View>
          {imageMedia.length > 3 && (
            <View className="flex-row gap-0.5">
              {imageMedia
                .slice(3, 5)
                .map((image) => renderImage(image, cardImageHeight))}
            </View>
          )}
        </View>
      )}
      {audioMedia.length > 0 && (
        <View className="gap-2 px-4">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      <View className="-mt-1 flex-row justify-between gap-3 px-4 pb-3">
        <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
          <EmojiPicker
            color={accentColor}
            commentId={commentId}
            reactions={record.reactions}
            recordId={recordId}
          />
          {!!record.reactions?.length && (
            <View className="flex-row items-center">
              <Reactions
                color={accentColor}
                commentId={commentId}
                reactions={record.reactions}
                recordId={recordId}
              />
            </View>
          )}
        </View>
        {!!record.comments && (
          <Link asChild href={`/record/${record.id}?focus=comment`}>
            <Button size="xs" variant="ghost">
              <Text className="text-sm font-normal text-muted-foreground">
                {record.comments.length} repl
                {record.comments.length === 1 ? 'y' : 'ies'}
              </Text>
              <Icon
                className="-mr-0.5 text-muted-foreground"
                icon={ChatCircleDots}
              />
            </Button>
          </Link>
        )}
      </View>
    </Card>
  );
};

const TruncatedText = ({
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
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<View>(null);

  useEffect(() => {
    if (!numberOfLines || expanded) return;

    const node = textRef.current as unknown as HTMLElement | null;
    if (!node) return;

    // scrollHeight > clientHeight means text is clipped by numberOfLines
    if (node.scrollHeight > node.clientHeight) {
      setTruncated(true);
    }
  }, [numberOfLines, expanded, text]);

  return (
    <View>
      <Text
        ref={textRef}
        className={className}
        numberOfLines={expanded ? undefined : numberOfLines}
      >
        {text}
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
