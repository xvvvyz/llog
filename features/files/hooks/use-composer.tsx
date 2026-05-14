import { Preview } from '@/features/files/components/composer/preview';
import { Toolbar } from '@/features/files/components/composer/toolbar';
import { useFileComposerState } from '@/features/files/hooks/use-composer-state';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import { type UseFileComposerOptions } from '@/features/files/types/composer';
import * as React from 'react';

export const useFileComposer = ({
  actionsDisabled,
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
    clearFocusedAudioId,
    documentFiles,
    focusedAudioId,
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
    actionsDisabled,
    isOpen,
    files,
    onDeleteFile,
    onReorderFiles,
    onUploadFile,
    recordId,
    replyId,
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
      actionsDisabled={actionsDisabled}
      audioMedia={audioMedia}
      autoPlayPendingVideoId={autoPlayPendingVideoId}
      documentFiles={documentFiles}
      extraAttachmentCount={extraAttachmentCount}
      extraPreview={extraPreview}
      focusedAudioId={focusedAudioId}
      onDeleteFile={handleDeleteFile}
      onFocusedAudioApplied={clearFocusedAudioId}
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
      disabled={actionsDisabled}
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
