import { EmojiPicker } from '@/components/emoji-picker';
import { Reactions } from '@/components/reactions';
import { RecordOrReplyDropdownMenu } from '@/components/record-or-reply-dropdown-menu';
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
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { toggleReaction } from '@/mutations/toggle-reaction';
import { toggleRecordPin } from '@/mutations/toggle-record-pin';
import { useMyRole } from '@/queries/use-my-role';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { Media } from '@/types/media';
import { Profile } from '@/types/profile';
import { Reaction } from '@/types/reaction';
import { Record as RecordType } from '@/types/record';
import { Reply } from '@/types/reply';
import { cn } from '@/utilities/cn';
import * as m from '@/utilities/media';
import { formatDate } from '@/utilities/time';
import { Link, router } from 'expo-router';
import { ArrowBendDownLeft } from 'phosphor-react-native/lib/module/icons/ArrowBendDownLeft';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { PushPin } from 'phosphor-react-native/lib/module/icons/PushPin';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const DoubleTapReactionZone = ({
  className,
  onDoubleTap,
}: {
  className?: string;
  onDoubleTap: () => void;
}) => {
  const gesture = React.useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDelay(260)
        .maxDistance(12)
        .onEnd(() => {
          onDoubleTap();
        })
        .runOnJS(true),
    [onDoubleTap]
  );

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View className={cn('min-h-8 flex-1 self-stretch', className)} />
    </GestureDetector>
  );
};

export const RecordOrReply = ({
  className,
  replyId,
  logId,
  numberOfLines,
  record,
  recordId: recordIdProp,
  variant,
}: {
  className?: string;
  replyId?: string;
  logId?: string;
  numberOfLines?: number;
  record: Partial<
    (RecordType | Reply) & {
      author: Profile & { image?: Media };
      replies: Pick<Reply, 'id'>[];
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
  const sheetManager = useSheetManager();
  const ui = useUi();

  const { audioMedia, visualMedia } = useFilteredMedia(record.media || []);

  const handleDoubleTapReaction = React.useCallback(() => {
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
      replyId,
    });
  }, [
    logId,
    profile.id,
    record.reactions,
    record.teamId,
    recordId,
    replyId,
    ui.doubleTapEmoji,
  ]);

  const idIndexMap = React.useMemo(() => {
    const next: Record<string, number> = {};

    visualMedia.forEach((item, index) => {
      next[item.id] = index;
    });

    return next;
  }, [visualMedia]);

  const renderMediaThumb = React.useCallback(
    (item: Media) => {
      return (
        <Pressable
          className="flex-1"
          disabled={m.isVideoMediaProcessing(item)}
          key={item.id}
          onPress={() =>
            !m.isVideoMediaProcessing(item) &&
            router.push({
              pathname: `/record/[recordId]/media`,
              params: {
                recordId: recordId || record.id!,
                ...(replyId && { replyId }),
                defaultIndex: String(idIndexMap[item.id]),
              },
            })
          }
        >
          <Image
            fill
            uri={m.getVisualMediaThumbnailUri(item)}
            wrapperClassName="rounded-2xl"
          />
          {item.type === 'video' && (
            <View className="pointer-events-none absolute inset-0 items-center justify-center">
              {m.isVideoMediaProcessing(item) ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="size-10 items-center justify-center rounded-full bg-black/50">
                  <Icon
                    className="text-white"
                    icon={Play}
                    size={20}
                    weight="fill"
                  />
                </View>
              )}
            </View>
          )}
        </Pressable>
      );
    },
    [replyId, idIndexMap, record.id, recordId]
  );

  if (variant === 'compact') {
    return (
      <View
        className={cn(
          'border-border-secondary border-t px-4 pt-4 pb-3',
          className
        )}
      >
        <View className="flex-row gap-3">
          <Avatar
            avatar={record.author?.image?.uri}
            id={record.author?.id}
            seedId={record.author?.avatarSeedId}
          />
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 flex-row items-baseline gap-2">
                <Text
                  className="shrink leading-tight font-medium"
                  numberOfLines={1}
                >
                  {record.author?.name}
                </Text>
                <Text className="text-muted-foreground shrink-0 text-sm leading-tight">
                  {formatDate(record.date)}
                </Text>
              </View>
              <RecordOrReplyDropdownMenu
                className="-mt-1.5 -mr-1.5 -mb-3"
                accentColor={accentColor}
                authorId={record.author?.id}
                replyId={replyId}
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
              <View className="mt-4 aspect-[3/2] gap-0.5">
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
            <View className="mt-3 flex-row items-stretch gap-1.5">
              <View className="flex-row flex-wrap items-center gap-1.5 self-center">
                <EmojiPicker
                  color={accentColor}
                  replyId={replyId}
                  logId={logId}
                  reactions={record.reactions}
                  recordId={recordId}
                  teamId={record.teamId}
                />
                {!!record.reactions?.length && (
                  <View className="flex-row items-center gap-2">
                    <Reactions
                      color={accentColor}
                      replyId={replyId}
                      logId={logId}
                      reactions={record.reactions}
                      recordId={recordId}
                      teamId={record.teamId}
                    />
                  </View>
                )}
              </View>
              <DoubleTapReactionZone
                className="-mt-3 -mb-3 pt-3 pb-3"
                onDoubleTap={handleDoubleTapReaction}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Card className={cn('gap-4', className)}>
      <View className="flex-row items-start gap-3 p-4 pb-0">
        <Avatar
          avatar={record.author?.image?.uri}
          id={record.author?.id}
          seedId={record.author?.avatarSeedId}
        />
        <View className="flex-1">
          <Text className="leading-tight font-medium" numberOfLines={1}>
            {record.author?.name}
          </Text>
          <Text className="text-muted-foreground text-sm leading-tight">
            {formatDate(record.date)}
          </Text>
        </View>
        <View className="-mt-1.5 -mr-1.5 flex-row items-center gap-1.5">
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
          <RecordOrReplyDropdownMenu
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
          className="px-4 select-text"
          color={accentColor}
          numberOfLines={numberOfLines}
          text={record.text}
        />
      )}
      {!!visualMedia.length && (
        <View className="aspect-[3/2] gap-0.5">
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
      <View className="-mt-1 flex-row items-stretch gap-3 px-3 pb-3">
        <View className="flex-row flex-wrap items-center gap-1.5 self-center">
          <EmojiPicker
            color={accentColor}
            replyId={replyId}
            logId={logId}
            reactions={record.reactions}
            recordId={recordId}
            teamId={record.teamId}
          />
          {!!record.reactions?.length && (
            <View className="flex-row items-center gap-2">
              <Reactions
                color={accentColor}
                replyId={replyId}
                logId={logId}
                reactions={record.reactions}
                recordId={recordId}
                teamId={record.teamId}
              />
            </View>
          )}
        </View>
        <DoubleTapReactionZone
          className="-mt-3 -mb-3 pt-3 pb-3"
          onDoubleTap={handleDoubleTapReaction}
        />
        {!!record.replies && (
          <View className="flex-row items-center gap-1.5 self-center">
            {record.replies.length > 0 && (
              <Link asChild href={`/record/${record.id}?focus=reply`}>
                <Button size="xs" variant="ghost">
                  <Text className="text-muted-foreground text-sm font-normal">
                    {record.replies.length} repl
                    {record.replies.length === 1 ? 'y' : 'ies'}
                  </Text>
                </Button>
              </Link>
            )}
            <Button
              className="w-8 px-0"
              onPress={() => sheetManager.open('reply-create', record.id)}
              size="xs"
              variant="ghost"
            >
              <Icon
                className="text-muted-foreground"
                icon={ArrowBendDownLeft}
              />
            </Button>
          </View>
        )}
      </View>
    </Card>
  );
};
