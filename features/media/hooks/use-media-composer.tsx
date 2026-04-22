import { MediaComposerPreview } from '@/features/media/components/media-composer-preview';
import { MediaComposerToolbar } from '@/features/media/components/media-composer-toolbar';
import { useMediaComposerState } from '@/features/media/hooks/use-media-composer-state';
import { type UseMediaComposerOptions } from '@/features/media/types/media-composer.types';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { router } from 'expo-router';
import * as React from 'react';

export const useMediaComposer = ({
  replyId,
  isOpen,
  media,
  onDeleteMedia,
  onOpenAudio,
  onUploadMedia,
  recordId,
}: UseMediaComposerOptions) => {
  const { suspend } = useSheetManager();
  const {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteMedia,
    handlePickFiles,
    isBusy,
    mediaCount,
    pendingAudio,
    removeLocalPreviewUri,
  } = useMediaComposerState({
    isOpen,
    media,
    onDeleteMedia,
    onUploadMedia,
    scopeKey: `${recordId ?? ''}:${replyId ?? ''}`,
  });

  const handleOpenVisual = React.useCallback(
    (mediaId: string) => {
      if (!recordId) return;

      suspend();
      router.push({
        pathname: '/record/[recordId]/media',
        params: {
          recordId,
          ...(replyId && { replyId }),
          id: mediaId,
        },
      });
    },
    [recordId, replyId, suspend]
  );

  const mediaPreview = (
    <MediaComposerPreview
      audioMedia={audioMedia}
      autoPlayPendingVideoId={autoPlayPendingVideoId}
      onDeleteMedia={handleDeleteMedia}
      onOpenVisual={handleOpenVisual}
      onRemoteReady={removeLocalPreviewUri}
      pendingAudio={pendingAudio}
      visualItems={allVisual}
    />
  );

  const toolbar = (
    <MediaComposerToolbar
      canAddAudio={canAddAudio}
      onBrowseMedia={handleBrowseMedia}
      onCaptureMedia={handleCaptureMedia}
      onOpenAudio={onOpenAudio}
      onPickFiles={handlePickFiles}
    />
  );

  return {
    isBusy,
    mediaCount,
    mediaPreview,
    toolbar,
  };
};
