import { Preview } from '@/features/files/components/composer/preview';
import { Toolbar } from '@/features/files/components/composer/toolbar';
import { useFileComposerState } from '@/features/files/hooks/use-composer-state';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import { type UseFileComposerOptions } from '@/features/files/types/composer';
import * as React from 'react';

export const useFileComposer = ({
  actionsDisabled,
  deferQueuedUploads,
  replyId,
  isOpen,
  extraAttachmentCount = 0,
  extraAttachmentMenuItems,
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
    handleRenameFile,
    handleReorderDocumentFiles,
    handleReorderVisualItems,
    isBusy,
    fileCount,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  } = useFileComposerState({
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
      onRenameFile={handleRenameFile}
      onReorderDocumentFiles={handleReorderDocumentFiles}
      onReorderVisualItems={handleReorderVisualItems}
      pendingAudio={pendingAudio}
      pendingDocuments={pendingDocuments}
      visualItems={allVisual}
    />
  );

  const toolbar = (
    <Toolbar
      attachmentMenuItems={extraAttachmentMenuItems}
      canAddAudio={canAddAudio}
      disabled={actionsDisabled}
      onBrowseMedia={handleBrowseMedia}
      onCaptureMedia={handleCaptureMedia}
      onOpenAudio={onOpenAudio}
      onPickDocuments={handlePickDocuments}
      trailingItems={extraToolbarItems}
      portalName={[
        'file-composer-attachment-menu',
        recordId ?? 'draft',
        replyId ?? 'record',
      ].join('-')}
    />
  );

  return {
    isBusy,
    fileCount: fileCount + extraAttachmentCount,
    filePreview,
    toolbar,
  };
};
