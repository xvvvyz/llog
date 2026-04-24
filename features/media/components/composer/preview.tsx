import { AudioPreview } from '@/features/media/components/composer/audio-preview';
import { VisualPreview } from '@/features/media/components/composer/visual-preview';
import type * as mediaComposer from '@/features/media/types/composer';
import type { Media } from '@/features/media/types/media';
import * as React from 'react';

export const Preview = ({
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
      <VisualPreview
        autoPlayPendingVideoId={autoPlayPendingVideoId}
        onDeleteMedia={onDeleteMedia}
        onOpenVisual={onOpenVisual}
        onRemoteReady={onRemoteReady}
        visualItems={visualItems}
      />
      <AudioPreview
        audioMedia={audioMedia}
        onDeleteMedia={onDeleteMedia}
        pendingAudio={pendingAudio}
      />
    </React.Fragment>
  );
};
