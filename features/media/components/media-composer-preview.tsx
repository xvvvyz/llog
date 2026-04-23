import { MediaComposerAudioPreview } from '@/features/media/components/media-composer-audio-preview';
import { MediaComposerVisualPreview } from '@/features/media/components/media-composer-visual-preview';
import type { Media } from '@/features/media/types/media';
import type * as mediaComposer from '@/features/media/types/media-composer.types';
import * as React from 'react';

export const MediaComposerPreview = ({
  audioMedia,
  autoPlayPendingVideoId,
  onDeleteMedia,
  onOpenVisual,
  onRemoteReady,
  pendingAudio,
  visualItems,
}: {
  audioMedia: Media[];
  autoPlayPendingVideoId?: string;
  onDeleteMedia: (mediaId: string) => void;
  onOpenVisual: (mediaId: string) => void;
  onRemoteReady: (mediaId: string) => void;
  pendingAudio: mediaComposer.PendingAudioUpload[];
  visualItems: mediaComposer.VisualPreviewItem[];
}) => {
  return (
    <React.Fragment>
      <MediaComposerVisualPreview
        autoPlayPendingVideoId={autoPlayPendingVideoId}
        onDeleteMedia={onDeleteMedia}
        onOpenVisual={onOpenVisual}
        onRemoteReady={onRemoteReady}
        visualItems={visualItems}
      />
      <MediaComposerAudioPreview
        audioMedia={audioMedia}
        onDeleteMedia={onDeleteMedia}
        pendingAudio={pendingAudio}
      />
    </React.Fragment>
  );
};
