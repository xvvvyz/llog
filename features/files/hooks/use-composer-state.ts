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
  | 'onRenameFile'
  | 'onReorderFiles'
  | 'onUploadFile'
  | 'recordId'
  | 'replyId'
> & { scopeKey: string };

type OrderedFileInput = { id: string; order?: number | null };

export const useFileComposerState = ({
  actionsDisabled,
  deferQueuedUploads,
  isOpen,
  files,
  onDeleteFile,
  onRenameFile,
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

  const visibleFileIds = React.useMemo(
    () => new Set(visibleFiles.map((item) => item.id)),
    [visibleFiles]
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
    pendingUploads,
    reorderPendingUploads,
    renamePendingUpload,
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

  const pendingUploadIds = React.useMemo(
    () => new Set(pendingUploads.map((item) => item.id)),
    [pendingUploads]
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

  const handleReorderDocumentFiles = React.useCallback(
    (files: OrderedFileInput[]) => {
      if (actionsDisabled) return;
      if (deferQueuedUploads) reorderPendingUploads(files);

      const persistedFiles = files.filter((file) =>
        visibleFileIds.has(file.id)
      );

      if (!persistedFiles.length) return;
      if (!deferQueuedUploads && queuedAttachmentsForParent.length > 0) return;
      onReorderFiles?.(persistedFiles);
    },
    [
      actionsDisabled,
      deferQueuedUploads,
      onReorderFiles,
      queuedAttachmentsForParent.length,
      reorderPendingUploads,
      visibleFileIds,
    ]
  );

  const handleReorderVisualItems = React.useCallback(
    (files: OrderedFileInput[]) => {
      if (actionsDisabled) return;

      const allFilesArePendingUploads =
        files.length > 1 &&
        files.every(
          (file) =>
            pendingUploadIds.has(file.id) && !visibleFileIds.has(file.id)
        );

      if (allFilesArePendingUploads) {
        reorderPendingUploads(files);
        return;
      }

      if (queuedAttachmentsForParent.length > 0) return;
      onReorderFiles?.(files);
    },
    [
      actionsDisabled,
      onReorderFiles,
      pendingUploadIds,
      queuedAttachmentsForParent.length,
      reorderPendingUploads,
      visibleFileIds,
    ]
  );

  const handleRenameFile = React.useCallback(
    async (fileId: string, name: string) => {
      if (actionsDisabled) return;

      if (
        !visibleFileIds.has(fileId) &&
        pendingUploads.some((item) => item.id === fileId)
      ) {
        renamePendingUpload(fileId, name);
        return;
      }

      await onRenameFile?.(fileId, name);
    },
    [
      actionsDisabled,
      onRenameFile,
      pendingUploads,
      renamePendingUpload,
      visibleFileIds,
    ]
  );

  const canReorderPersistedFiles =
    !!onReorderFiles &&
    !actionsDisabled &&
    queuedAttachmentsForParent.length === 0;

  const canReorderDocumentFiles =
    !!onReorderFiles &&
    !actionsDisabled &&
    documentFiles.length + pendingDocuments.length > 1 &&
    (queuedAttachmentsForParent.length === 0 || !!deferQueuedUploads);

  const canReorderQueuedVisualItems =
    !!deferQueuedUploads &&
    !actionsDisabled &&
    allVisual.length > 1 &&
    allVisual.every((item) => item.pending && pendingUploadIds.has(item.id));

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
    handleRenameFile: onRenameFile ? handleRenameFile : undefined,
    handleReorderDocumentFiles: canReorderDocumentFiles
      ? handleReorderDocumentFiles
      : undefined,
    handleReorderVisualItems:
      canReorderPersistedFiles || canReorderQueuedVisualItems
        ? handleReorderVisualItems
        : undefined,
    isBusy: isDeleteTransitioning,
    fileCount,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  };
};
