import { AudioPlaylist } from '@/features/files/components/audio-player';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import { EntryMenuContent } from '@/features/records/components/entry-menu';
import { LinkAttachments } from '@/features/records/components/link-attachments';
import { MediaGrid } from '@/features/records/components/media-grid';
import { ReactionsRow } from '@/features/records/components/reactions-row';
import { RecordTagChips } from '@/features/records/components/record-tag-chips';
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
  canAnalyzeAudio,
  canUnpinRecord,
  className,
  documentFiles,
  entryMenuState,
  links,
  logId,
  logName,
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
  const hasDocumentFiles = documentFiles.length > 0;
  const hasLinks = links.length > 0;
  const hasPinnedAction = 'isPinned' in record && !!record.isPinned;
  const hasHeaderActions = hasPinnedAction || entryMenuState.hasMenu;
  const hasRecordTags = record.tags?.some((tag) => !!tag.name);

  const headerActions = hasHeaderActions && (
    <View className="max-w-52 items-end shrink">
      <View className="flex-row -mr-1.5 -mt-1.5 gap-1.5 items-center justify-end">
        {hasPinnedAction && (
          <Button
            disabled={!canUnpinRecord}
            onPress={onUnpin}
            size="icon-xs"
            variant="ghost"
            wrapperClassName="opacity-100"
          >
            <Icon color={accentColor} icon={PushPin} size={16} weight="fill" />
          </Button>
        )}
        <EntryMenuContent
          accentColor={accentColor}
          authorId={record.author?.id}
          isPinned={'isPinned' in record ? !!record.isPinned : undefined}
          logId={logId}
          recordId={recordId}
          replyId={replyId}
          state={entryMenuState}
          teamId={record.teamId}
        />
      </View>
    </View>
  );

  return (
    <Card className={cn('gap-4', className)}>
      {hasRecordTags ? (
        <View className="pt-4 px-4 gap-4">
          <View className="relative">
            <RecordTagChips
              linkToSearch
              logName={logName}
              tags={record.tags}
              className={cn(
                'w-full justify-start',
                hasPinnedAction && 'pr-20',
                !hasPinnedAction && hasHeaderActions && 'pr-12'
              )}
            />
            {headerActions && (
              <View className="absolute right-0 top-0">{headerActions}</View>
            )}
          </View>
          <View className="flex-row gap-3 items-start">
            <Avatar
              avatar={record.author?.image?.uri}
              className="border-border-secondary border"
              id={record.author?.id}
              seedId={record.author?.avatarSeedId}
              size={42}
            />
            <View className="flex-1 min-w-0">
              <Text className="font-medium leading-snug" numberOfLines={1}>
                {record.author?.name}
              </Text>
              <Text className="leading-snug text-muted-foreground text-sm">
                {formatDate(record.date)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row p-4 pb-0 gap-3 items-start">
          <Avatar
            avatar={record.author?.image?.uri}
            className="border-border-secondary border"
            id={record.author?.id}
            seedId={record.author?.avatarSeedId}
            size={42}
          />
          <View className="flex-1 min-w-0">
            <Text className="font-medium leading-snug" numberOfLines={1}>
              {record.author?.name}
            </Text>
            <Text className="leading-snug text-muted-foreground text-sm">
              {formatDate(record.date)}
            </Text>
          </View>
          {headerActions}
        </View>
      )}
      {!!displayText && (
        <TruncatedText
          className="-mt-1 px-4 select-text"
          color={accentColor}
          numberOfLines={numberOfLines}
          text={displayText}
        />
      )}
      <MediaGrid recordId={recordId} visualMedia={visualMedia} />
      {audioMedia.length > 0 && (
        <View className="px-4 gap-2">
          <AudioPlaylist canAnalyzeAudio={canAnalyzeAudio} clips={audioMedia} />
        </View>
      )}
      {(hasDocumentFiles || hasLinks) && (
        <View className="gap-2">
          {hasDocumentFiles && (
            <DocumentAttachments
              documents={documentFiles}
              triggerClassName="pl-3 pr-4"
              triggerIconClassName="ml-1.5"
            />
          )}
          {hasLinks && (
            <LinkAttachments
              links={links}
              triggerClassName="pl-3 pr-4"
              triggerIconClassName="ml-1.5"
            />
          )}
        </View>
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
            <View className="flex-row gap-1.5 items-center self-end">
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
