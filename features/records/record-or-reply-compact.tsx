import { AudioPlaylist } from '@/features/media/audio-player';
import { RecordOrReplyDropdownMenu } from '@/features/records/record-or-reply-dropdown-menu';
import { RecordOrReplyMediaGrid } from '@/features/records/record-or-reply-media-grid';
import { RecordOrReplyReactionsRow } from '@/features/records/record-or-reply-reactions-row';
import { type RecordOrReplySharedProps } from '@/features/records/record-or-reply.types';
import { TruncatedText } from '@/features/records/truncated-text';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { Avatar } from '@/ui/avatar';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const CompactRecordOrReply = ({
  accentColor,
  audioMedia,
  className,
  logId,
  numberOfLines,
  onDoubleTapReaction,
  record,
  recordId,
  replyId,
  visualMedia,
}: RecordOrReplySharedProps & { className?: string }) => {
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
          {visualMedia.length > 0 && (
            <View className="mt-4">
              <RecordOrReplyMediaGrid
                fallbackRecordId={record.id}
                recordId={recordId}
                replyId={replyId}
                visualMedia={visualMedia}
              />
            </View>
          )}
          {audioMedia.length > 0 && (
            <View className="mt-4 gap-2">
              <AudioPlaylist clips={audioMedia} />
            </View>
          )}
          <RecordOrReplyReactionsRow
            accentColor={accentColor}
            className="mt-3 gap-1.5"
            logId={logId}
            onDoubleTapReaction={onDoubleTapReaction}
            record={record}
            recordId={recordId}
            replyId={replyId}
          />
        </View>
      </View>
    </View>
  );
};
