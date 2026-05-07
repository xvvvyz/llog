import { canTranscribeAudioAnalysisFile } from '@/domain/files/audio-analysis';
import { useProfile } from '@/features/account/queries/use-profile';
import { useUi } from '@/features/account/queries/use-ui';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useLogColor } from '@/features/logs/hooks/use-color';
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
  numberOfLines,
  record,
  recordId: recordIdProp,
  variant,
}: {
  className?: string;
  replyId?: string;
  logId?: string;
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

  const { audioMedia, documentFiles, visualMedia } = useFilteredFiles(
    record.files || []
  );

  const audioAnalysisMedia = React.useMemo(
    () => [
      ...audioMedia,
      ...visualMedia.filter((file) => file.type === 'video'),
    ],
    [audioMedia, visualMedia]
  );

  const detectableAudioMedia = React.useMemo(
    () => audioAnalysisMedia.filter((file) => file.tracks == null),
    [audioAnalysisMedia]
  );

  const transcribableAudioMedia = React.useMemo(
    () => audioAnalysisMedia.filter(canTranscribeAudioAnalysisFile),
    [audioAnalysisMedia]
  );

  const entryMenuState = useEntryMenuState({
    authorId: record.author?.id,
    hasDetectableAudio: detectableAudioMedia.length > 0,
    hasTranscribableAudio: transcribableAudioMedia.length > 0,
    isIdentifyingAudio: detectableAudioMedia.some((file) => file.isIdentifying),
    isTranscribingAudio: transcribableAudioMedia.some(
      (file) => file.isTranscribing
    ),
    logId,
    replyId,
    teamId: record.teamId,
  });

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

  const sharedProps: EntryTypes.EntrySharedProps = {
    accentColor,
    audioMedia,
    documentFiles,
    entryMenuState,
    links: record.links ?? [],
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
    return <CompactEntry {...sharedProps} className={className} />;
  }

  return (
    <EntryCard
      {...sharedProps}
      canUnpinRecord={myRole.canPinRecords}
      className={className}
      onOpenReply={handleOpenReply}
      onUnpin={handleUnpin}
    />
  );
};
