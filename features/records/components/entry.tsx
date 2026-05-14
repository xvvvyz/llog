import { useProfile } from '@/features/account/queries/use-profile';
import { useUi } from '@/features/account/queries/use-ui';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useConnectivity } from '@/features/offline/connectivity';
import * as outboxStore from '@/features/offline/outbox-store';
import { CompactEntry } from '@/features/records/components/compact-entry';
import { EntryCard } from '@/features/records/components/entry-card';
import { useEntryMenuState } from '@/features/records/components/entry-menu';
import { toggleRecordPin } from '@/features/records/mutations/toggle-pin';
import { toggleReaction } from '@/features/records/mutations/toggle-reaction';
import type * as EntryTypes from '@/features/records/types/entry';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
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
  const colorScheme = useColorScheme();
  const logColor = useLogColor({ id: logId });
  const accentColor = logColor?.[colorScheme === 'dark' ? 'lighter' : 'darker'];
  const myRole = useMyRole({ teamId: record.teamId });
  const recordId = recordIdProp ?? record.id ?? '';
  const profile = useProfile();
  const sheetManager = useSheetManager();
  const ui = useUi();
  const connectivity = useConnectivity();
  const isLocalPending = !!record.localStatus;
  const isCompletedLocalSubmission = record.localOutboxStatus === 'complete';

  const canManageLocalPendingEntry =
    isLocalPending &&
    !isCompletedLocalSubmission &&
    (!replyId || record.localNeedsDraftReplay === true);

  const isSyncedLocalReply =
    !!replyId && isLocalPending && isCompletedLocalSubmission;

  const { audioMedia, documentFiles, visualMedia } = useFilteredFiles(
    record.files || []
  );

  const rawEntryMenuState = useEntryMenuState({
    authorId: record.author?.id,
    logId,
    replyId,
    teamId: record.teamId,
  });

  const entryMenuState = React.useMemo(() => {
    const canDelete = canManageLocalPendingEntry
      ? true
      : isLocalPending
        ? isSyncedLocalReply && rawEntryMenuState.canDelete
        : rawEntryMenuState.canDelete;

    const canDuplicate = rawEntryMenuState.canDuplicate;

    const canEdit = canManageLocalPendingEntry
      ? true
      : isLocalPending
        ? isSyncedLocalReply && rawEntryMenuState.canEdit
        : rawEntryMenuState.canEdit;

    const canPin = rawEntryMenuState.canPin;
    const canRetry = record.localOutboxStatus === 'error';
    const canTag = rawEntryMenuState.canTag;
    const hasActionsAboveDelete = canEdit || canRetry || canTag || canPin;

    const hasMenu =
      canDelete || canDuplicate || canEdit || canRetry || canPin || canTag;

    return {
      ...rawEntryMenuState,
      canDelete,
      canDuplicate,
      canEdit,
      canPin,
      canRetry,
      canTag,
      hasActionsAboveDelete,
      hasMenu,
      isDeleteDisabled:
        isSyncedLocalReply ||
        (!canManageLocalPendingEntry && rawEntryMenuState.isDeleteDisabled),
      isDuplicateDisabled:
        isLocalPending ||
        rawEntryMenuState.isDuplicateDisabled ||
        !connectivity.canRunNetworkActions,
      isEditDisabled:
        isSyncedLocalReply ||
        (!canManageLocalPendingEntry && rawEntryMenuState.isEditDisabled),
      isPinDisabled: !connectivity.canRunNetworkActions,
      isRetryDisabled: !connectivity.canRunNetworkActions,
      isTagDisabled: !connectivity.canRunNetworkActions,
    };
  }, [
    canManageLocalPendingEntry,
    connectivity.canRunNetworkActions,
    isLocalPending,
    isSyncedLocalReply,
    record.localOutboxStatus,
    rawEntryMenuState,
  ]);

  const handleDoubleTapReaction = React.useCallback(() => {
    if (isLocalPending) return;
    if (!connectivity.canRunNetworkActions) return;
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
    connectivity.canRunNetworkActions,
    isLocalPending,
    profile.id,
    record.reactions,
    record.teamId,
    recordId,
    replyId,
    ui.doubleTapEmoji,
  ]);

  const sharedProps: EntryTypes.EntrySharedProps = {
    accentColor,
    audioMedia,
    canAnalyzeAudio: myRole.canManage,
    canOpenReply: !isLocalPending,
    documentFiles,
    entryMenuState,
    links: record.links ?? [],
    logId,
    logName,
    networkActionsEnabled: connectivity.canRunNetworkActions && !isLocalPending,
    numberOfLines,
    onDoubleTapReaction: handleDoubleTapReaction,
    record,
    recordId,
    replyId,
    visualMedia,
  };

  const handleOpenReply = React.useCallback(() => {
    if (isLocalPending) return;
    if (!record.id) return;

    sheetManager.open('reply-create', record.id, undefined, {
      teamId: record.teamId,
    });
  }, [isLocalPending, record.id, record.teamId, sheetManager]);

  const handleUnpin = React.useCallback(() => {
    if (!connectivity.canRunNetworkActions) return;

    if (isLocalPending) {
      outboxStore.updateQueuedRecordPin({ isPinned: false, recordId });
      return;
    }

    toggleRecordPin({ id: recordId, isPinned: false });
  }, [connectivity.canRunNetworkActions, isLocalPending, recordId]);

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
