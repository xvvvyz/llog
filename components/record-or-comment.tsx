import { EmojiPicker } from '@/components/emoji-picker';
import { Reactions } from '@/components/reactions';
import { RecordOrCommentDropdownMenu } from '@/components/record-or-comment-dropdown-menu';
import { TruncatedText } from '@/components/truncated-text';
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
import { toggleReaction } from '@/mutations/toggle-reaction';
import { toggleRecordPin } from '@/mutations/toggle-record-pin';
import { useMyRole } from '@/queries/use-my-role';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { Comment } from '@/types/comment';
import { Media } from '@/types/media';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { Record as RecordType } from '@/types/record';
import { cn } from '@/utilities/cn';
import { formatDate } from '@/utilities/time';
import { Link, router } from 'expo-router';
import { ChatCircleDots } from 'phosphor-react-native/lib/module/icons/ChatCircleDots';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { PushPin } from 'phosphor-react-native/lib/module/icons/PushPin';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const myRole = useMyRole({ teamId: record.teamId });
  const recordId = recordIdProp ?? record.id ?? '';
  const profile = useProfile();
  const ui = useUi();

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (!record.teamId) return;
      const emoji = ui.doubleTapEmoji;

      const existingReaction = record.reactions?.find(
        (r) => r.emoji === emoji && r.author?.id === profile.id
      );

      toggleReaction({
        emoji,
        existingReactionId: existingReaction?.id,
        logId,
        profileId: profile.id,
        teamId: record.teamId,
        recordId,
        commentId,
      });
    })
    .runOnJS(true)
    .hitSlop({ top: 16, bottom: 16, left: 8, right: 16 });

  const { audioMedia, visualMedia } = useFilteredMedia(record.media || []);

  const idIndexMap = React.useMemo(
    () =>
      visualMedia.reduce(
        (acc, item, index) => {
          acc[item.id] = index;
          return acc;
        },
        {} as Record<string, number>
      ),
    [visualMedia]
  );

  const renderMediaThumb = React.useCallback(
    (item: Media) => {
      return (
        <Pressable
          className="flex-1"
          key={item.id}
          onPress={() =>
            router.push({
              pathname: `/record/[recordId]/media`,
              params: {
                recordId: recordId || record.id!,
                ...(commentId && { commentId }),
                defaultIndex: String(idIndexMap[item.id]),
              },
            })
          }
        >
          <Image
            fill
            uri={item.type === 'video' ? item.previewUri! : item.uri}
            wrapperClassName="rounded-2xl"
          />
          {item.type === 'video' && (
            <View
              className="absolute inset-0 items-center justify-center"
              pointerEvents="none"
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                <Icon
                  className="ml-0.5 text-white"
                  icon={Play}
                  size={20}
                  weight="fill"
                />
              </View>
            </View>
          )}
        </Pressable>
      );
    },
    [commentId, idIndexMap, record.id, recordId]
  );

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
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 flex-row items-baseline gap-2">
                <Text
                  className="shrink font-medium leading-5"
                  numberOfLines={1}
                >
                  {record.author?.name}
                </Text>
                <Text className="shrink-0 text-sm leading-5 text-muted-foreground">
                  {formatDate(record.date)}
                </Text>
              </View>
              <RecordOrCommentDropdownMenu
                className="-mb-3 -mr-1.5 -mt-1.5"
                accentColor={accentColor}
                authorId={record.author?.id}
                commentId={commentId}
                isDetail
                isPinned={'isPinned' in record ? !!record.isPinned : undefined}
                recordId={recordId}
                teamId={record.teamId}
              />
            </View>
            {!!record.text && (
              <TruncatedText
                className="select-text"
                color={accentColor}
                numberOfLines={numberOfLines}
                text={record.text}
              />
            )}
            {!!visualMedia.length && (
              <View className="mt-4 gap-0.5" style={{ aspectRatio: 3 / 2 }}>
                <View className="flex-1 flex-row gap-0.5">
                  {visualMedia.slice(0, 3).map(renderMediaThumb)}
                </View>
                {visualMedia.length > 3 && (
                  <View className="flex-1 flex-row gap-0.5">
                    {visualMedia.slice(3, 6).map(renderMediaThumb)}
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
                logId={logId}
                reactions={record.reactions}
                recordId={recordId}
                teamId={record.teamId}
              />
              {!!record.reactions?.length && (
                <View className="flex-row items-center gap-2">
                  <Reactions
                    color={accentColor}
                    commentId={commentId}
                    logId={logId}
                    reactions={record.reactions}
                    recordId={recordId}
                    teamId={record.teamId}
                  />
                </View>
              )}
              <GestureDetector gesture={doubleTap} touchAction="pan-y">
                <View className="min-h-7 flex-1" />
              </GestureDetector>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Card className={cn('gap-4', className)}>
      <View className="flex-row items-start gap-3 p-4 pb-0">
        <Avatar avatar={record.author?.image?.uri} id={record.author?.id} />
        <View className="flex-1">
          <Text className="font-medium leading-5" numberOfLines={1}>
            {record.author?.name}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatDate(record.date)}
          </Text>
        </View>
        <View className="-mr-1.5 -mt-1.5 flex-row items-center gap-1.5">
          {'isPinned' in record && record.isPinned && (
            <Button
              className="size-8 rounded-lg"
              disabled={!myRole.canPinRecords}
              onPress={() => toggleRecordPin({ id: recordId, isPinned: false })}
              size="icon"
              variant="ghost"
              wrapperClassName="rounded-lg opacity-100"
            >
              <Icon
                icon={PushPin}
                size={16}
                style={accentColor ? { color: accentColor } : undefined}
                weight="fill"
              />
            </Button>
          )}
          <RecordOrCommentDropdownMenu
            accentColor={accentColor}
            authorId={record.author?.id}
            isPinned={'isPinned' in record ? !!record.isPinned : undefined}
            recordId={recordId}
            teamId={record.teamId}
          />
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
      {!!visualMedia.length && (
        <View className="gap-0.5" style={{ aspectRatio: 3 / 2 }}>
          <View className="flex-1 flex-row gap-0.5">
            {visualMedia.slice(0, 3).map(renderMediaThumb)}
          </View>
          {visualMedia.length > 3 && (
            <View className="flex-1 flex-row gap-0.5">
              {visualMedia.slice(3, 6).map(renderMediaThumb)}
            </View>
          )}
        </View>
      )}
      {audioMedia.length > 0 && (
        <View className="gap-2 px-4">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      <View className="-mt-1 flex-row justify-between gap-3 px-3 pb-3">
        <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
          <EmojiPicker
            color={accentColor}
            commentId={commentId}
            logId={logId}
            reactions={record.reactions}
            recordId={recordId}
            teamId={record.teamId}
          />
          {!!record.reactions?.length && (
            <View className="flex-row items-center gap-2">
              <Reactions
                color={accentColor}
                commentId={commentId}
                logId={logId}
                reactions={record.reactions}
                recordId={recordId}
                teamId={record.teamId}
              />
            </View>
          )}
          <GestureDetector gesture={doubleTap} touchAction="pan-y">
            <View className="min-h-7 flex-1" />
          </GestureDetector>
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
