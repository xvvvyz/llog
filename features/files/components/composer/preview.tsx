import { AudioPreview } from '@/features/files/components/composer/audio-preview';
import { VisualPreview } from '@/features/files/components/composer/visual-preview';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { cn } from '@/lib/cn';
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
  onReorderFiles,
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
  onReorderFiles?: (files: { id: string }[]) => void;
  onRemoteReady: (fileId: string) => void;
  pendingAudio: fileComposer.PendingAudioUpload[];
  pendingDocuments: fileComposer.PendingDocumentUpload[];
  visualItems: fileComposer.VisualPreviewItem[];
}) => {
  const hasAudioAttachments = audioMedia.length > 0 || pendingAudio.length > 0;

  const hasDocumentAttachments =
    documentFiles.length > 0 || pendingDocuments.length > 0;

  const hasExtraAttachments = extraAttachmentCount > 0;
  const hasLowerAttachments = hasDocumentAttachments || hasExtraAttachments;

  const hasPreviewItems =
    visualItems.length > 0 || hasAudioAttachments || hasLowerAttachments;

  if (!hasPreviewItems) return null;

  const showMediaAttachmentDivider =
    visualItems.length > 0 && hasLowerAttachments;

  const padLowerAttachmentsAfterMedia =
    showMediaAttachmentDivider && !hasAudioAttachments;

  const padAudioAfterMedia = visualItems.length > 0 && hasAudioAttachments;

  return (
    <View className="py-4 border-border-secondary border-t gap-4">
      <VisualPreview
        autoPlayPendingVideoId={autoPlayPendingVideoId}
        onDeleteFile={onDeleteFile}
        onOpenVisual={onOpenVisual}
        onRemoteReady={onRemoteReady}
        onReorderVisualItems={onReorderFiles}
        showBottomBorder={showMediaAttachmentDivider}
        visualItems={visualItems}
      />
      {hasAudioAttachments && (
        <View className={cn(padAudioAfterMedia && 'pt-4')}>
          <AudioPreview
            audioMedia={audioMedia}
            onDeleteFile={onDeleteFile}
            pendingAudio={pendingAudio}
          />
        </View>
      )}
      {hasLowerAttachments && (
        <View
          className={cn(
            hasDocumentAttachments && hasExtraAttachments ? 'gap-2' : 'gap-4',
            padLowerAttachmentsAfterMedia && 'pt-4'
          )}
        >
          <DocumentAttachments
            documents={documentFiles}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
            onReorderFiles={onReorderFiles}
            pendingDocuments={pendingDocuments}
            triggerClassName="px-4"
          />
          {extraPreview}
        </View>
      )}
    </View>
  );
};
