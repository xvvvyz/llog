import { useClipboardFilePaste } from '@/features/files/hooks/use-clipboard-file-paste';
import { useFilteredFiles } from '@/features/files/hooks/use-filtered-files';
import { useFilePendingDeletions } from '@/features/files/hooks/use-pending-deletions';
import { useFilePickerActions } from '@/features/files/hooks/use-picker-actions';
import { useFileUploadPreviewState } from '@/features/files/hooks/use-upload-preview-state';
import type { UseFileComposerOptions } from '@/features/files/types/composer';
import * as React from 'react';

type UseFileComposerStateOptions = Pick<
  UseFileComposerOptions,
  'isOpen' | 'files' | 'onDeleteFile' | 'onReorderFiles' | 'onUploadFile'
> & { scopeKey: string };

export const useFileComposerState = ({
  isOpen,
  files,
  onDeleteFile,
  onReorderFiles,
  onUploadFile,
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

  const {
    allVisual,
    autoPlayPendingVideoId,
    pendingAudio,
    pendingDocuments,
    pendingUploads,
    removeLocalPreviewUri,
    uploadAssets,
  } = useFileUploadPreviewState({
    fileCount: files.length,
    onUploadFile,
    scopeKey,
    visibleFiles,
    visualMedia,
  });

  const handleDeleteFile = React.useCallback(
    (fileId: string) => {
      removeLocalPreviewUri(fileId);
      requestDeleteFile(fileId);
    },
    [removeLocalPreviewUri, requestDeleteFile]
  );

  const handleReorderFiles = React.useCallback(
    (files: { id: string }[]) => {
      onReorderFiles?.(files);
    },
    [onReorderFiles]
  );

  useClipboardFilePaste({ enabled: isOpen, onUploadAssets: uploadAssets });

  const { handleBrowseMedia, handleCaptureMedia, handlePickDocuments } =
    useFilePickerActions({ onUploadAssets: uploadAssets });

  const canAddAudio = true;

  return {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    documentFiles,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteFile,
    handlePickDocuments,
    handleReorderFiles: onReorderFiles ? handleReorderFiles : undefined,
    isBusy: pendingUploads.length > 0 || isDeleteTransitioning,
    fileCount:
      audioMedia.length +
      documentFiles.length +
      pendingAudio.length +
      pendingDocuments.length +
      allVisual.length,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  };
};
