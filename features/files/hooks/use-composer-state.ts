import { useClipboardFilePaste } from '@/features/files/hooks/use-clipboard-file-paste';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useFilePendingDeletions } from '@/features/files/hooks/use-pending-deletions';
import { useFilePickerActions } from '@/features/files/hooks/use-picker-actions';
import { useFileUploadPreviewState } from '@/features/files/hooks/use-upload-preview-state';
import * as queuedAttachmentUtils from '@/features/files/lib/queued-attachments';
import type { UseFileComposerOptions } from '@/features/files/types/composer';
import * as outbox from '@/features/offline/outbox-hooks';
import type { QueuedParent } from '@/features/offline/types';
import * as React from 'react';

type UseFileComposerStateOptions = Pick<
  UseFileComposerOptions,
  | 'isOpen'
  | 'actionsDisabled'
  | 'deferQueuedUploads'
  | 'files'
  | 'onDeleteFile'
  | 'onReorderFiles'
  | 'onUploadFile'
  | 'recordId'
  | 'replyId'
> & { scopeKey: string };

export const useFileComposerState = ({
  actionsDisabled,
  deferQueuedUploads,
  isOpen,
  files,
  onDeleteFile,
  onReorderFiles,
  onUploadFile,
  recordId,
  replyId,
  scopeKey,
}: UseFileComposerStateOptions) => {
  const {
    handleDeleteFile: requestDeleteFile,
    isDeleteTransitioning,
    pendingDeletions,
  } = useFilePendingDeletions({ files, onDeleteFile, scopeKey });

  const visibleFiles = React.useMemo(
    () => files.filter((item) => !pendingDeletions[item.id]),
    [files, pendingDeletions]
  );

  const { audioMedia, documentFiles, visualMedia } =
    useFilteredFiles(visibleFiles);

  const parent = React.useMemo<QueuedParent | undefined>(() => {
    if (replyId && recordId) {
      return { parentId: replyId, parentType: 'reply', recordId };
    }

    if (recordId) return { parentId: recordId, parentType: 'record', recordId };
    return undefined;
  }, [recordId, replyId]);

  const outboxSnapshot = outbox.useOutbox();

  const queuedAttachmentsForParent = React.useMemo(
    () =>
      queuedAttachmentUtils.getQueuedAttachmentsForParent(
        outboxSnapshot.attachments,
        parent
      ),
    [outboxSnapshot.attachments, parent]
  );

  const {
    allVisual,
    autoPlayPendingVideoId,
    clearFocusedAudioId,
    focusedAudioId,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
    uploadAssets,
  } = useFileUploadPreviewState({
    actionsDisabled,
    deferQueuedUploads,
    onUploadFile,
    parent,
    queuedAttachmentsForParent,
    scopeKey,
    visibleFiles,
    visualMedia,
  });

  const queuedAttachmentIds = React.useMemo(
    () => new Set(queuedAttachmentsForParent.map((item) => item.id)),
    [queuedAttachmentsForParent]
  );

  const handleDeleteFile = React.useCallback(
    (fileId: string) => {
      if (actionsDisabled) return;
      removeLocalPreviewUri(fileId);

      if (queuedAttachmentIds.has(fileId)) {
        void outbox.removeQueuedAttachment(fileId);
        return;
      }

      requestDeleteFile(fileId);
    },
    [
      actionsDisabled,
      queuedAttachmentIds,
      removeLocalPreviewUri,
      requestDeleteFile,
    ]
  );

  const handleReorderFiles = React.useCallback(
    (files: { id: string }[]) => {
      if (actionsDisabled) return;
      onReorderFiles?.(files);
    },
    [actionsDisabled, onReorderFiles]
  );

  const canReorderFiles =
    !actionsDisabled && queuedAttachmentsForParent.length === 0;

  useClipboardFilePaste({
    enabled: isOpen && !actionsDisabled,
    onUploadAssets: uploadAssets,
  });

  const { handleBrowseMedia, handleCaptureMedia, handlePickDocuments } =
    useFilePickerActions({ onUploadAssets: uploadAssets });

  const canAddAudio = true;

  const fileCount = React.useMemo(
    () =>
      new Set([
        ...audioMedia.map((item) => item.id),
        ...documentFiles.map((item) => item.id),
        ...allVisual.map((item) => item.id),
        ...pendingAudio.map((item) => item.id),
        ...pendingDocuments.map((item) => item.id),
      ]).size,
    [allVisual, audioMedia, documentFiles, pendingAudio, pendingDocuments]
  );

  return {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    clearFocusedAudioId,
    documentFiles,
    focusedAudioId,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteFile,
    handlePickDocuments,
    handleReorderFiles:
      onReorderFiles && canReorderFiles ? handleReorderFiles : undefined,
    isBusy: isDeleteTransitioning,
    fileCount,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  };
};
