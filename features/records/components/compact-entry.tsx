import { AudioPlaylist } from '@/features/media/components/audio-player';
import { EntryMenu } from '@/features/records/components/entry-menu';
import { MediaGrid } from '@/features/records/components/media-grid';
import { ReactionsRow } from '@/features/records/components/reactions-row';
import { TruncatedText } from '@/features/records/components/truncated-text';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { type EntrySharedProps } from '@/features/records/types/entry';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { Avatar } from '@/ui/avatar';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const CompactEntry = ({
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
}: EntrySharedProps & { className?: string }) => {
  const displayText = trimDisplayText(record.text);

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
          className="border-border-secondary border"
          id={record.author?.id}
          seedId={record.author?.avatarSeedId}
          size={42}
        />
        <View className="flex-1">
          <View className="flex-row gap-2 items-start justify-between">
            <View className="flex-1 flex-row gap-2 items-baseline">
              <Text
                className="font-medium leading-snug shrink"
                numberOfLines={1}
              >
                {record.author?.name}
              </Text>
              <Text className="leading-snug text-muted-foreground text-sm shrink-0">
                {formatDate(record.date)}
              </Text>
            </View>
            <EntryMenu
              accentColor={accentColor}
              authorId={record.author?.id}
              className="-mb-3 -mr-1.5 -mt-1.5"
              isDetail
              isPinned={'isPinned' in record ? !!record.isPinned : undefined}
              logId={logId}
              recordId={recordId}
              replyId={replyId}
              teamId={record.teamId}
            />
          </View>
          {!!displayText && (
            <TruncatedText
              className="select-text"
              color={accentColor}
              numberOfLines={numberOfLines}
              text={displayText}
            />
          )}
          {visualMedia.length > 0 && (
            <View className="mt-4">
              <MediaGrid recordId={recordId} visualMedia={visualMedia} />
            </View>
          )}
          {audioMedia.length > 0 && (
            <View className="mt-4 gap-2">
              <AudioPlaylist clips={audioMedia} />
            </View>
          )}
          <ReactionsRow
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
