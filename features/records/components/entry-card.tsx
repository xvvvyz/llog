import { AudioPlaylist } from '@/features/media/components/audio-player';
import { DocumentAttachments } from '@/features/media/components/document-attachments';
import { EntryMenu } from '@/features/records/components/entry-menu';
import { MediaGrid } from '@/features/records/components/media-grid';
import { ReactionsRow } from '@/features/records/components/reactions-row';
import { TruncatedText } from '@/features/records/components/truncated-text';
import { openRecordDetail } from '@/features/records/lib/route';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { type EntrySharedProps } from '@/features/records/types/entry';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/time';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { ArrowBendDownLeft, PushPin } from 'phosphor-react-native';
import { View } from 'react-native';

export const EntryCard = ({
  accentColor,
  audioMedia,
  canUnpinRecord,
  className,
  documentMedia,
  logId,
  numberOfLines,
  onDoubleTapReaction,
  onOpenReply,
  onUnpin,
  record,
  recordId,
  replyId,
  visualMedia,
}: EntrySharedProps & {
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
          className="border-border-secondary border"
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
              disabled={!canUnpinRecord}
              onPress={onUnpin}
              size="icon-sm"
              variant="ghost"
              wrapperClassName="opacity-100"
            >
              <Icon
                color={accentColor}
                icon={PushPin}
                size={16}
                weight="fill"
              />
            </Button>
          )}
          <EntryMenu
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
      <MediaGrid recordId={recordId} visualMedia={visualMedia} />
      {audioMedia.length > 0 && (
        <View className="px-4 gap-2">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      {documentMedia.length > 0 && (
        <DocumentAttachments
          documents={documentMedia}
          triggerClassName="pl-3 pr-4"
          triggerIconClassName="ml-1.5"
        />
      )}
      <ReactionsRow
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
                  onPress={() => openRecordDetail(recordId)}
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
