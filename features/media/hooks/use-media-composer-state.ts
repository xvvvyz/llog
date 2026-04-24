import { useClipboardMediaPaste } from '@/features/media/hooks/use-clipboard-media-paste';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaPendingDeletions } from '@/features/media/hooks/use-media-pending-deletions';
import { useMediaPickerActions } from '@/features/media/hooks/use-media-picker-actions';
import { useMediaUploadPreviewState } from '@/features/media/hooks/use-media-upload-preview-state';
import type { UseMediaComposerOptions } from '@/features/media/types/media-composer.types';
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

  const { audioMedia, visualMedia } = useFilteredMedia(visibleMedia);

  const {
    allVisual,
    autoPlayPendingVideoId,
    pendingAudio,
    pendingUploads,
    removeLocalPreviewUri,
    uploadAssets,
  } = useMediaUploadPreviewState({
    mediaCount: media.length,
    onUploadMedia,
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

  const { handleBrowseMedia, handleCaptureMedia, handlePickFiles } =
    useMediaPickerActions({ onUploadAssets: uploadAssets });

  const canAddAudio = true;

  return {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteMedia,
    handlePickFiles,
    isBusy: pendingUploads.length > 0 || isDeleteTransitioning,
    mediaCount: audioMedia.length + pendingAudio.length + allVisual.length,
    pendingAudio,
    removeLocalPreviewUri,
  };
};
