import { AudioPlaylist } from '@/features/files/components/audio-player';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import { EntryMenuContent } from '@/features/records/components/entry-menu';
import { EntrySyncStatus } from '@/features/records/components/entry-sync-status';
import { LinkAttachments } from '@/features/records/components/link-attachments';
import { MediaGrid } from '@/features/records/components/media-grid';
import { RecordTagChips } from '@/features/records/components/record-tag-chips';
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
  accentTextClassName,
  audioMedia,
  canAnalyzeAudio,
  className,
  documentFiles,
  entryMenuState,
  links,
  logId,
  logName,
  numberOfLines,
  onDoubleTapReaction,
  record,
  recordId,
  replyId,
  syncStatus,
  visualMedia,
}: EntrySharedProps & { className?: string }) => {
  const displayText = trimDisplayText(record.text);
  const hasDocumentFiles = documentFiles.length > 0;
  const hasLinks = links.length > 0;
  const hasRecordTags = record.tags?.some((tag) => !!tag.name);
  const hasTopMeta = hasRecordTags || !!syncStatus;

  return (
    <View
      className={cn(
        'border-border-secondary border-t px-4 pt-4 pb-3',
        className
      )}
    >
      {hasTopMeta && (
        <View className="flex-row flex-wrap mb-3 gap-1 items-start">
          {syncStatus && (
            <EntrySyncStatus className="shrink-0" status={syncStatus} />
          )}
          {hasRecordTags && (
            <RecordTagChips
              className="flex-1 gap-1 justify-start"
              linkToSearch
              logName={logName}
              tags={record.tags}
            />
          )}
        </View>
      )}
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
            <View className="flex-1 flex-row -mt-0.5 gap-2 items-baseline">
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
            <EntryMenuContent
              accentTextClassName={accentTextClassName}
              authorId={record.author?.id}
              className="-mb-3 -mr-1.5 -mt-1.5"
              isDetail
              isLocalPending={!!record.localStatus}
              isPinned={'isPinned' in record ? !!record.isPinned : undefined}
              logId={logId}
              recordId={recordId}
              replyId={replyId}
              state={entryMenuState}
              tags={record.tags}
              teamId={record.teamId}
            />
          </View>
          {!!displayText && (
            <TruncatedText
              className="select-text"
              linkClassName={accentTextClassName}
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
              <AudioPlaylist
                canAnalyzeAudio={canAnalyzeAudio}
                clips={audioMedia}
              />
            </View>
          )}
          {(hasDocumentFiles || hasLinks) && (
            <View className="mt-4 gap-2">
              {hasDocumentFiles && (
                <DocumentAttachments
                  documents={documentFiles}
                  triggerClassName="pl-0"
                  triggerIconClassName="ml-1.5"
                />
              )}
              {hasLinks && (
                <LinkAttachments
                  links={links}
                  triggerClassName="pl-0"
                  triggerIconClassName="ml-1.5"
                />
              )}
            </View>
          )}
          <ReactionsRow
            accentTextClassName={accentTextClassName}
            className="mt-3"
            disabled={!!record.localStatus}
            logId={logId}
            onDoubleTapReaction={onDoubleTapReaction}
            record={record}
            recordId={recordId}
            replyId={replyId}
            trailing={undefined}
          />
        </View>
      </View>
    </View>
  );
};
