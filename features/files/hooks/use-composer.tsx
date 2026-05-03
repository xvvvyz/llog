import { Preview } from '@/features/files/components/composer/preview';
import { Toolbar } from '@/features/files/components/composer/toolbar';
import { useFileComposerState } from '@/features/files/hooks/use-composer-state';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import { type UseFileComposerOptions } from '@/features/files/types/composer';
import * as React from 'react';

export const useFileComposer = ({
  replyId,
  isOpen,
  extraAttachmentCount = 0,
  extraPreview,
  extraToolbarItems,
  files,
  onDeleteFile,
  onOpenAudio,
  onRenameFile,
  onReorderFiles,
  onUploadFile,
  recordId,
}: UseFileComposerOptions) => {
  const {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    documentFiles,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteFile,
    handlePickDocuments,
    handleReorderFiles,
    isBusy,
    fileCount,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  } = useFileComposerState({
    isOpen,
    files,
    onDeleteFile,
    onReorderFiles,
    onUploadFile,
    scopeKey: `${recordId ?? ''}:${replyId ?? ''}`,
  });

  const { openMediaLightbox } = useMediaLightbox({ recordId });

  const handleOpenVisual = React.useCallback(
    (fileId: string) => {
      openMediaLightbox(fileId);
    },
    [openMediaLightbox]
  );

  const filePreview = (
    <Preview
      audioMedia={audioMedia}
      autoPlayPendingVideoId={autoPlayPendingVideoId}
      documentFiles={documentFiles}
      extraAttachmentCount={extraAttachmentCount}
      extraPreview={extraPreview}
      onDeleteFile={handleDeleteFile}
      onOpenVisual={handleOpenVisual}
      onRemoteReady={removeLocalPreviewUri}
      onRenameFile={onRenameFile}
      onReorderFiles={handleReorderFiles}
      pendingAudio={pendingAudio}
      pendingDocuments={pendingDocuments}
      visualItems={allVisual}
    />
  );

  const toolbar = (
    <Toolbar
      canAddAudio={canAddAudio}
      onBrowseMedia={handleBrowseMedia}
      onCaptureMedia={handleCaptureMedia}
      onOpenAudio={onOpenAudio}
      onPickDocuments={handlePickDocuments}
      trailingItems={extraToolbarItems}
    />
  );

  return {
    isBusy,
    fileCount: fileCount + extraAttachmentCount,
    filePreview,
    toolbar,
  };
};
