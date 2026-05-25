import { AudioPreview } from '@/features/files/components/composer/audio-preview';
import { VisualPreview } from '@/features/files/components/composer/visual-preview';
import { DocumentAttachments } from '@/features/files/components/document-attachments';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import type * as React from 'react';
import { View } from 'react-native';

type OrderedPreviewItem = { id: string; order?: number | null };

export const Preview = ({
  actionsDisabled,
  audioMedia,
  autoPlayPendingVideoId,
  documentFiles,
  extraAttachmentCount = 0,
  extraPreview,
  focusedAudioId,
  onFocusedAudioApplied,
  onDeleteFile,
  onOpenVisual,
  onRenameFile,
  onReorderDocumentFiles,
  onReorderVisualItems,
  onRemoteReady,
  pendingAudio,
  pendingDocuments,
  visualItems,
}: {
  actionsDisabled?: boolean;
  audioMedia: FileItem[];
  autoPlayPendingVideoId?: string;
  documentFiles: FileItem[];
  extraAttachmentCount?: number;
  extraPreview?: React.ReactNode;
  focusedAudioId?: string | null;
  onFocusedAudioApplied?: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onOpenVisual: (fileId: string) => void;
  onRenameFile?: (fileId: string, name: string) => Promise<void>;
  onReorderDocumentFiles?: (files: OrderedPreviewItem[]) => void;
  onReorderVisualItems?: (files: OrderedPreviewItem[]) => void;
  onRemoteReady: (fileId: string) => void;
  pendingAudio: fileComposer.PendingAudioUpload[];
  pendingDocuments: fileComposer.PendingDocumentUpload[];
  visualItems: fileComposer.VisualPreviewItem[];
}) => {
  const hasAudioAttachments = audioMedia.length > 0 || pendingAudio.length > 0;

  const hasDocumentAttachments =
    documentFiles.length > 0 || pendingDocuments.length > 0;

  const hasExtraAttachments = extraAttachmentCount > 0;

  const hasLowerAttachments =
    hasAudioAttachments || hasDocumentAttachments || hasExtraAttachments;

  const hasPreviewItems = visualItems.length > 0 || hasLowerAttachments;
  if (!hasPreviewItems) return null;

  const showVisualAttachmentDivider =
    visualItems.length > 0 && hasLowerAttachments;

  const lowerDocumentGapClassName =
    hasDocumentAttachments && hasExtraAttachments ? 'gap-[18px]' : 'gap-4';

  return (
    <View className="border-border-secondary border-t">
      <VisualPreview
        actionsDisabled={actionsDisabled}
        autoPlayPendingVideoId={autoPlayPendingVideoId}
        onDeleteFile={onDeleteFile}
        onOpenVisual={onOpenVisual}
        onRemoteReady={onRemoteReady}
        onReorderVisualItems={onReorderVisualItems}
        showBottomBorder={showVisualAttachmentDivider}
        visualItems={visualItems}
      />
      {hasLowerAttachments && (
        <View className="p-3 gap-3">
          {hasAudioAttachments && (
            <AudioPreview
              actionsDisabled={actionsDisabled}
              audioMedia={audioMedia}
              focusedAudioId={focusedAudioId}
              onDeleteFile={onDeleteFile}
              onFocusedAudioApplied={onFocusedAudioApplied}
              pendingAudio={pendingAudio}
            />
          )}
          {(hasDocumentAttachments || hasExtraAttachments) && (
            <View className={lowerDocumentGapClassName}>
              <DocumentAttachments
                actionsDisabled={actionsDisabled}
                className={hasDocumentAttachments ? '-my-[9px]' : undefined}
                documents={documentFiles}
                onDeleteFile={onDeleteFile}
                onRenameFile={onRenameFile}
                onReorderFiles={onReorderDocumentFiles}
                pendingDocuments={pendingDocuments}
                triggerActionClassName="-mr-[9px]"
                triggerClassName="min-h-8 px-0"
              />
              {extraPreview}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
