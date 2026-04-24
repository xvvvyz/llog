import { AudioPlaylist } from '@/features/media/components/audio-player';
import { RecordOrReplyDropdownMenu } from '@/features/records/components/record-or-reply-dropdown-menu';
import { RecordOrReplyMediaGrid } from '@/features/records/components/record-or-reply-media-grid';
import { RecordOrReplyReactionsRow } from '@/features/records/components/record-or-reply-reactions-row';
import { TruncatedText } from '@/features/records/components/truncated-text';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { type RecordOrReplySharedProps } from '@/features/records/types/record-or-reply.types';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { ArrowBendDownLeft, PushPin } from 'phosphor-react-native';
import { View } from 'react-native';

export const RecordOrReplyCard = ({
  accentColor,
  audioMedia,
  canUnpinRecord,
  className,
  logId,
  numberOfLines,
  onDoubleTapReaction,
  onOpenReply,
  onUnpin,
  record,
  recordId,
  replyId,
  visualMedia,
}: RecordOrReplySharedProps & {
  canUnpinRecord: boolean;
  className?: string;
  onOpenReply: () => void;
  onUnpin: () => void;
}) => {
  const displayText = trimDisplayText(record.text);

  return (
    <Card className={cn('gap-4', className)}>
      <View className="flex-row p-4 pb-0 gap-3 items-start">
        <Avatar
          avatar={record.author?.image?.uri}
          id={record.author?.id}
          seedId={record.author?.avatarSeedId}
          size={42}
        />
        <View className="flex-1">
          <Text className="font-medium leading-snug" numberOfLines={1}>
            {record.author?.name}
          </Text>
          <Text className="leading-snug text-muted-foreground text-sm">
            {formatDate(record.date)}
          </Text>
        </View>
        <View className="flex-row -mr-1.5 -mt-1.5 gap-1.5 items-center">
          {'isPinned' in record && record.isPinned && (
            <Button
              className="size-8 rounded-lg"
              disabled={!canUnpinRecord}
              onPress={onUnpin}
              size="icon"
              variant="ghost"
              wrapperClassName="rounded-lg opacity-100"
            >
              <Icon
                color={accentColor}
                icon={PushPin}
                size={16}
                weight="fill"
              />
            </Button>
          )}
          <RecordOrReplyDropdownMenu
            accentColor={accentColor}
            authorId={record.author?.id}
            isPinned={'isPinned' in record ? !!record.isPinned : undefined}
            logId={logId}
            recordId={recordId}
            teamId={record.teamId}
          />
        </View>
      </View>
      {!!displayText && (
        <TruncatedText
          className="px-4 select-text"
          color={accentColor}
          numberOfLines={numberOfLines}
          text={displayText}
        />
      )}
      <RecordOrReplyMediaGrid visualMedia={visualMedia} />
      {audioMedia.length > 0 && (
        <View className="px-4 gap-2">
          <AudioPlaylist className="-mr-1" clips={audioMedia} />
        </View>
      )}
      <RecordOrReplyReactionsRow
        accentColor={accentColor}
        className="-mt-1 pb-3 px-3 gap-3"
        logId={logId}
        onDoubleTapReaction={onDoubleTapReaction}
        record={record}
        recordId={recordId}
        replyId={replyId}
        trailing={
          !!record.replies && (
            <View className="flex-row gap-1.5 items-center self-center">
              {record.replies.length > 0 && (
                <Button
                  onPress={() => router.setParams({ recordId })}
                  size="xs"
                  variant="ghost"
                >
                  <Text className="font-normal text-muted-foreground text-sm">
                    {record.replies.length} repl
                    {record.replies.length === 1 ? 'y' : 'ies'}
                  </Text>
                </Button>
              )}
              <Button
                className="w-8 px-0"
                onPress={onOpenReply}
                size="xs"
                variant="ghost"
              >
                <Icon
                  className="text-muted-foreground"
                  icon={ArrowBendDownLeft}
                />
              </Button>
            </View>
          )
        }
      />
    </Card>
  );
};
