import * as recordStatus from '@/domain/records/status';
import { useProfile } from '@/features/account/queries/use-profile';
import { useUi } from '@/features/account/queries/use-ui';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useLogColor } from '@/features/logs/hooks/use-color';
import * as localEntry from '@/features/offline/local-entry';
import * as outboxStore from '@/features/offline/outbox-store';
import { CompactEntry } from '@/features/records/components/compact-entry';
import { EntryCard } from '@/features/records/components/entry-card';
import { useEntryMenuState } from '@/features/records/components/entry-menu';
import { resolveEntryMenuState } from '@/features/records/lib/entry-menu-state';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { toggleReaction } from '@/features/records/mutations/toggle-reaction';
import type * as EntryTypes from '@/features/records/types/entry';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { getSpectrumAccentTextClassName } from '@/theme/spectrum-class-names';
import * as React from 'react';

export const Entry = ({
  className,
  replyId,
  logId,
  logName,
  numberOfLines,
  record,
  recordId: recordIdProp,
  variant,
}: {
  className?: string;
  replyId?: string;
  logId?: string;
  logName?: string;
  numberOfLines?: number;
  record: EntryTypes.EntryRecord;
  recordId?: string;
  variant?: 'compact';
}) => {
  const logColor = useLogColor({ id: logId });

  const accentTextClassName = getSpectrumAccentTextClassName(
    logColor.colorIndex
  );

  const myRole = useMyRole({ teamId: record.teamId });
  const recordId = recordIdProp ?? record.id ?? '';
  const profile = useProfile();
  const sheetManager = useSheetManager();
  const ui = useUi();
  const isLocalPending = localEntry.hasLocalStatus(record);
  const isScheduled = recordStatus.recordIsScheduled(record);

  const isUploadingLocalSubmission =
    record.localOutboxStatus === 'syncing' ||
    record.localOutboxStatus === 'publishing';

  const isPublishingLocalSubmission = record.localOutboxStatus === 'publishing';

  const syncStatus = isLocalPending
    ? isUploadingLocalSubmission
      ? 'uploading'
      : 'queued'
    : undefined;

  const canManageLocalPendingEntry =
    isLocalPending && (!replyId || record.localNeedsDraftReplay === true);

  const { audioMedia, documentFiles, visualMedia } = useFilteredFiles(
    record.files || []
  );

  const authorRole = React.useMemo(
    () =>
      record.author?.user?.roles?.find((role) => role.teamId === record.teamId)
        ?.role,
    [record.author?.user?.roles, record.teamId]
  );

  const rawEntryMenuState = useEntryMenuState({
    authorId: record.author?.id,
    authorRole,
    hasSelectedRecordTags: record.tags?.some((tag) => !!tag.id),
    logId,
    replyId,
    teamId: record.teamId,
  });

  const entryMenuState = React.useMemo(() => {
    return resolveEntryMenuState({
      canManageLocalPendingEntry,
      isLocalPending,
      isPublishingLocalSubmission,
      rawState: rawEntryMenuState,
    });
  }, [
    canManageLocalPendingEntry,
    isLocalPending,
    isPublishingLocalSubmission,
    rawEntryMenuState,
  ]);

  const handleDoubleTapReaction = React.useCallback(() => {
    if (isLocalPending) return;
    if (isScheduled) return;
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
    isLocalPending,
    isScheduled,
    profile.id,
    record.reactions,
    record.teamId,
    recordId,
    replyId,
    ui.doubleTapEmoji,
  ]);

  const sharedProps: EntryTypes.EntrySharedProps = {
    accentTextClassName,
    audioMedia,
    canAnalyzeAudio: myRole.canManage,
    canOpenReply: !isLocalPending && !isScheduled,
    documentFiles,
    entryMenuState,
    links: record.links ?? [],
    logId,
    logName,
    numberOfLines,
    onDoubleTapReaction: handleDoubleTapReaction,
    record,
    recordId,
    replyId,
    syncStatus,
    visualMedia,
  };

  const handleOpenReply = React.useCallback(() => {
    if (isLocalPending) return;
    if (isScheduled) return;
    if (!record.id) return;

    sheetManager.open('reply-create', record.id, undefined, {
      teamId: record.teamId,
    });
  }, [isLocalPending, isScheduled, record.id, record.teamId, sheetManager]);

  const handleUnpin = React.useCallback(() => {
    if (isLocalPending) {
      outboxStore.updateQueuedRecordPin({ isPinned: false, recordId });
      return;
    }

    toggleRecordPin({ id: recordId, isPinned: false });
  }, [isLocalPending, recordId]);

  if (variant === 'compact') {
    return <CompactEntry {...sharedProps} className={className} />;
  }

  return (
    <EntryCard
      {...sharedProps}
      canUnpinRecord={entryMenuState.canPin && !entryMenuState.isPinDisabled}
      className={className}
      onOpenReply={handleOpenReply}
      onUnpin={handleUnpin}
    />
  );
};
