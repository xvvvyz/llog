import { AudioPlaylist } from '@/features/media/components/audio-player';
import { RecordOrReplyDropdownMenu } from '@/features/records/components/record-or-reply-dropdown-menu';
import { RecordOrReplyMediaGrid } from '@/features/records/components/record-or-reply-media-grid';
import { RecordOrReplyReactionsRow } from '@/features/records/components/record-or-reply-reactions-row';
import { TruncatedText } from '@/features/records/components/truncated-text';
import { type RecordOrReplySharedProps } from '@/features/records/types/record-or-reply.types';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Link } from 'expo-router';
import { ArrowBendDownLeft } from 'phosphor-react-native/lib/module/icons/ArrowBendDownLeft';
import { PushPin } from 'phosphor-react-native/lib/module/icons/PushPin';
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
  return (
    <Card className={cn('gap-4', className)}>
      <View className="flex-row items-start gap-3 p-4 pb-0">
        <Avatar
          avatar={record.author?.image?.uri}
          id={record.author?.id}
          seedId={record.author?.avatarSeedId}
          size={42}
        />
        <View className="flex-1">
          <Text className="leading-snug font-medium" numberOfLines={1}>
            {record.author?.name}
          </Text>
          <Text className="text-muted-foreground text-sm leading-snug">
            {formatDate(record.date)}
          </Text>
        </View>
        <View className="-mt-1.5 -mr-1.5 flex-row items-center gap-1.5">
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
      <RecordOrReplyMediaGrid
        fallbackRecordId={record.id}
        recordId={recordId}
        replyId={replyId}
        visualMedia={visualMedia}
      />
      {audioMedia.length > 0 && (
        <View className="gap-2 px-4">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      <RecordOrReplyReactionsRow
        accentColor={accentColor}
        className="-mt-1 gap-3 px-3 pb-3"
        logId={logId}
        onDoubleTapReaction={onDoubleTapReaction}
        record={record}
        recordId={recordId}
        replyId={replyId}
        trailing={
          !!record.replies && (
            <View className="flex-row items-center gap-1.5 self-center">
              {record.replies.length > 0 && (
                <Link asChild href={`/record/${recordId}?focus=reply`}>
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
