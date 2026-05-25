import type { PickedFileAsset } from '@/features/files/lib/picked';
import { reorderFiles } from '@/features/files/mutations/reorder-files';
import { updateDocumentName } from '@/features/files/mutations/update-document-name';
import * as React from 'react';

type ComposerFileCallbacksOptions = {
  onDeleteFile: (fileId: string) => Promise<void>;
  onUploadFile: (
    asset: PickedFileAsset,
    fileId: string,
    order: number
  ) => Promise<void>;
};

type OrderedComposerFile = { id: string; order?: number | null };

export const useComposerFileCallbacks = ({
  onDeleteFile,
  onUploadFile,
}: ComposerFileCallbacksOptions) => {
  const handleUploadFile = React.useCallback(
    async (asset: PickedFileAsset, fileId: string, order: number) => {
      await onUploadFile(asset, fileId, order);
    },
    [onUploadFile]
  );

  const handleDeleteFile = React.useCallback(
    async (fileId: string) => {
      await onDeleteFile(fileId);
    },
    [onDeleteFile]
  );

  const handleRenameFile = React.useCallback(
    async (fileId: string, name: string) => {
      await updateDocumentName({ id: fileId, name });
    },
    []
  );

  const handleReorderFiles = React.useCallback(
    (files: OrderedComposerFile[]) => {
      void reorderFiles(files);
    },
    []
  );

  return {
    handleDeleteFile,
    handleRenameFile,
    handleReorderFiles,
    handleUploadFile,
  };
};
