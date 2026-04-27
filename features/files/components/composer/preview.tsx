import { AudioPreview } from '@/features/files/components/composer/audio-preview';
import { VisualPreview } from '@/features/files/components/composer/visual-preview';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import type * as React from 'react';
import { View } from 'react-native';

export const Preview = ({
  audioMedia,
  autoPlayPendingVideoId,
  documentFiles,
  extraAttachmentCount = 0,
  extraPreview,
  onDeleteFile,
  onOpenVisual,
  onRenameFile,
  onRemoteReady,
  pendingAudio,
  pendingDocuments,
  visualItems,
}: {
  audioMedia: FileItem[];
  autoPlayPendingVideoId?: string;
  documentFiles: FileItem[];
  extraAttachmentCount?: number;
  extraPreview?: React.ReactNode;
  onDeleteFile: (fileId: string) => void;
  onOpenVisual: (fileId: string) => void;
  onRenameFile?: (fileId: string, name: string) => Promise<void>;
  onRemoteReady: (fileId: string) => void;
  pendingAudio: fileComposer.PendingAudioUpload[];
  pendingDocuments: fileComposer.PendingDocumentUpload[];
  visualItems: fileComposer.VisualPreviewItem[];
}) => {
  const hasPreviewItems =
    visualItems.length > 0 ||
    audioMedia.length > 0 ||
    pendingAudio.length > 0 ||
    documentFiles.length > 0 ||
    pendingDocuments.length > 0 ||
    extraAttachmentCount > 0;

  if (!hasPreviewItems) return null;

  return (
    <View className="py-4 border-border-secondary border-t gap-4">
      <VisualPreview
        autoPlayPendingVideoId={autoPlayPendingVideoId}
        onDeleteFile={onDeleteFile}
        onOpenVisual={onOpenVisual}
        onRemoteReady={onRemoteReady}
        visualItems={visualItems}
      />
      <AudioPreview
        audioMedia={audioMedia}
        onDeleteFile={onDeleteFile}
        pendingAudio={pendingAudio}
      />
      <DocumentAttachments
        className="gap-0"
        documents={documentFiles}
        onDeleteFile={onDeleteFile}
        onRenameFile={onRenameFile}
        pendingDocuments={pendingDocuments}
        triggerClassName="px-4"
      />
      {extraPreview}
    </View>
  );
};
