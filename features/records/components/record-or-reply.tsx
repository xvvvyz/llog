import { useProfile } from '@/features/account/queries/use-profile';
import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { RecordOrReplyCard } from '@/features/records/components/record-or-reply-card';
import { CompactRecordOrReply } from '@/features/records/components/record-or-reply-compact';
import { toggleReaction } from '@/features/records/mutations/toggle-reaction';
import { toggleRecordPin } from '@/features/records/mutations/toggle-record-pin';
import type * as RecordOrReplyTypes from '@/features/records/types/record-or-reply.types';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useUi } from '@/queries/use-ui';
import * as React from 'react';

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
  record: RecordOrReplyTypes.RecordOrReplyRecord;
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

  const sharedProps: RecordOrReplyTypes.RecordOrReplySharedProps = {
    accentColor,
    audioMedia,
    logId,
    numberOfLines,
    onDoubleTapReaction: handleDoubleTapReaction,
    record,
    recordId,
    replyId,
    visualMedia,
  };

  const handleOpenReply = React.useCallback(() => {
    if (!record.id) return;
    sheetManager.open('reply-create', record.id);
  }, [record.id, sheetManager]);

  const handleUnpin = React.useCallback(() => {
    toggleRecordPin({ id: recordId, isPinned: false });
  }, [recordId]);

  if (variant === 'compact') {
    return <CompactRecordOrReply {...sharedProps} className={className} />;
  }

  return (
    <RecordOrReplyCard
      {...sharedProps}
      canUnpinRecord={myRole.canPinRecords}
      className={className}
      onOpenReply={handleOpenReply}
      onUnpin={handleUnpin}
    />
  );
};
