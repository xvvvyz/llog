import { Preview } from '@/features/media/components/composer/preview';
import { Toolbar } from '@/features/media/components/composer/toolbar';
import { useMediaComposerState } from '@/features/media/hooks/use-composer-state';
import { useMediaLightbox } from '@/features/media/hooks/use-lightbox';
import { type UseMediaComposerOptions } from '@/features/media/types/composer';
import * as React from 'react';

export const useMediaComposer = ({
  replyId,
  isOpen,
  extraAttachmentCount = 0,
  extraPreview,
  extraToolbarItems,
  media,
  onDeleteMedia,
  onOpenAudio,
  onRenameMedia,
  onUploadMedia,
  recordId,
}: UseMediaComposerOptions) => {
  const {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    documentMedia,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteMedia,
    handlePickDocuments,
    isBusy,
    mediaCount,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  } = useMediaComposerState({
    isOpen,
    media,
    onDeleteMedia,
    onUploadMedia,
    scopeKey: `${recordId ?? ''}:${replyId ?? ''}`,
  });

  const { openMediaLightbox } = useMediaLightbox({ recordId });

  const handleOpenVisual = React.useCallback(
    (mediaId: string) => {
      openMediaLightbox(mediaId);
    },
    [openMediaLightbox]
  );

  const mediaPreview = (
    <Preview
      audioMedia={audioMedia}
      autoPlayPendingVideoId={autoPlayPendingVideoId}
      documentMedia={documentMedia}
      extraAttachmentCount={extraAttachmentCount}
      extraPreview={extraPreview}
      onDeleteMedia={handleDeleteMedia}
      onOpenVisual={handleOpenVisual}
      onRemoteReady={removeLocalPreviewUri}
      onRenameMedia={onRenameMedia}
      pendingAudio={pendingAudio}
      pendingDocuments={pendingDocuments}
      visualItems={allVisual}
    />
  );

  const toolbar = (
    <Toolbar
      canAddAudio={canAddAudio}
      leadingItems={extraToolbarItems}
      onBrowseMedia={handleBrowseMedia}
      onCaptureMedia={handleCaptureMedia}
      onOpenAudio={onOpenAudio}
      onPickDocuments={handlePickDocuments}
    />
  );

  return {
    isBusy,
    mediaCount: mediaCount + extraAttachmentCount,
    mediaPreview,
    toolbar,
  };
};
