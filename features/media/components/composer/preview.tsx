import { AudioPreview } from '@/features/media/components/composer/audio-preview';
import { VisualPreview } from '@/features/media/components/composer/visual-preview';
import { DocumentAttachments } from '@/features/media/components/document-attachments';
import type * as mediaComposer from '@/features/media/types/composer';
import type { Media } from '@/features/media/types/media';
import type * as React from 'react';
import { View } from 'react-native';

export const Preview = ({
  audioMedia,
  autoPlayPendingVideoId,
  documentMedia,
  extraAttachmentCount = 0,
  extraPreview,
  onDeleteMedia,
  onOpenVisual,
  onRenameMedia,
  onRemoteReady,
  pendingAudio,
  pendingDocuments,
  visualItems,
}: {
  audioMedia: Media[];
  autoPlayPendingVideoId?: string;
  documentMedia: Media[];
  extraAttachmentCount?: number;
  extraPreview?: React.ReactNode;
  onDeleteMedia: (mediaId: string) => void;
  onOpenVisual: (mediaId: string) => void;
  onRenameMedia?: (mediaId: string, name: string) => Promise<void>;
  onRemoteReady: (mediaId: string) => void;
  pendingAudio: mediaComposer.PendingAudioUpload[];
  pendingDocuments: mediaComposer.PendingDocumentUpload[];
  visualItems: mediaComposer.VisualPreviewItem[];
}) => {
  const hasPreviewItems =
    visualItems.length > 0 ||
    audioMedia.length > 0 ||
    pendingAudio.length > 0 ||
    documentMedia.length > 0 ||
    pendingDocuments.length > 0 ||
    extraAttachmentCount > 0;

  if (!hasPreviewItems) return null;

  return (
    <View className="py-4 border-border-secondary border-t gap-4">
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
      <DocumentAttachments
        className="gap-0"
        documents={documentMedia}
        onDeleteMedia={onDeleteMedia}
        onRenameMedia={onRenameMedia}
        pendingDocuments={pendingDocuments}
        triggerClassName="px-4"
      />
      {extraPreview}
    </View>
  );
};
