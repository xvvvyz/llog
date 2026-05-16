import type { UseFileComposerOptions } from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import * as React from 'react';

type PendingDeletion = { requestId: number };

export const useFilePendingDeletions = ({
  files,
  onDeleteFile,
  scopeKey,
}: Pick<UseFileComposerOptions, 'files' | 'onDeleteFile'> & {
  scopeKey: string;
}) => {
  const [isDeleteTransitioning, startDeleteTransition] = React.useTransition();
  const nextDeleteRequestIdRef = React.useRef(0);

  const [pendingDeletions, setPendingDeletions] = React.useState<
    Record<string, PendingDeletion>
  >({});

  React.useEffect(() => {
    setPendingDeletions({});
  }, [scopeKey]);

  const handleDeleteFile = React.useCallback(
    (fileId: string) => {
      const requestId = ++nextDeleteRequestIdRef.current;

      setPendingDeletions((current) => ({
        ...current,
        [fileId]: { requestId },
      }));

      const deleteFile = async () => {
        try {
          await onDeleteFile(fileId);
        } catch {
          setPendingDeletions((current) => {
            const entry = current[fileId];
            if (!entry || entry.requestId !== requestId) return current;
            const next = { ...current };
            delete next[fileId];
            return next;
          });
        }
      };

      startDeleteTransition(() => {
        void deleteFile();
      });
    },
    [onDeleteFile, startDeleteTransition]
  );

  React.useEffect(() => {
    setPendingDeletions((current) => {
      let didChange = false;
      const fileIds = new Set(files.map((item: FileItem) => item.id));
      const next = { ...current };

      for (const fileId of Object.keys(current)) {
        if (!fileIds.has(fileId)) {
          delete next[fileId];
          didChange = true;
        }
      }

      return didChange ? next : current;
    });
  }, [files]);

  return { handleDeleteFile, isDeleteTransitioning, pendingDeletions };
};
