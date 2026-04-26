import { useClipboardMediaPaste } from '@/features/media/hooks/use-clipboard-media-paste';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaPendingDeletions } from '@/features/media/hooks/use-pending-deletions';
import { useMediaPickerActions } from '@/features/media/hooks/use-picker-actions';
import { useMediaUploadPreviewState } from '@/features/media/hooks/use-upload-preview-state';
import type { UseMediaComposerOptions } from '@/features/media/types/composer';
import * as React from 'react';

type UseMediaComposerStateOptions = Pick<
  UseMediaComposerOptions,
  'isOpen' | 'media' | 'onDeleteMedia' | 'onUploadMedia'
> & { scopeKey: string };

export const useMediaComposerState = ({
  isOpen,
  media,
  onDeleteMedia,
  onUploadMedia,
  scopeKey,
}: UseMediaComposerStateOptions) => {
  const {
    handleDeleteMedia: requestDeleteMedia,
    isDeleteTransitioning,
    pendingDeletions,
  } = useMediaPendingDeletions({ media, onDeleteMedia, scopeKey });

  const visibleMedia = React.useMemo(
    () => media.filter((item) => !pendingDeletions[item.id]),
    [media, pendingDeletions]
  );

  const { audioMedia, documentMedia, visualMedia } =
    useFilteredMedia(visibleMedia);

  const {
    allVisual,
    autoPlayPendingVideoId,
    pendingAudio,
    pendingDocuments,
    pendingUploads,
    removeLocalPreviewUri,
    uploadAssets,
  } = useMediaUploadPreviewState({
    mediaCount: media.length,
    onUploadMedia,
    scopeKey,
    visibleMedia,
    visualMedia,
  });

  const handleDeleteMedia = React.useCallback(
    (mediaId: string) => {
      removeLocalPreviewUri(mediaId);
      requestDeleteMedia(mediaId);
    },
    [removeLocalPreviewUri, requestDeleteMedia]
  );

  useClipboardMediaPaste({ enabled: isOpen, onUploadAssets: uploadAssets });

  const { handleBrowseMedia, handleCaptureMedia, handlePickDocuments } =
    useMediaPickerActions({ onUploadAssets: uploadAssets });

  const canAddAudio = true;

  return {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    documentMedia,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteMedia,
    handlePickDocuments,
    isBusy: pendingUploads.length > 0 || isDeleteTransitioning,
    mediaCount:
      audioMedia.length +
      documentMedia.length +
      pendingAudio.length +
      pendingDocuments.length +
      allVisual.length,
    pendingAudio,
    pendingDocuments,
    removeLocalPreviewUri,
  };
};
