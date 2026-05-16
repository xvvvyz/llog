import { downloadFile } from '@/features/files/lib/download-file';
import type { FileItem } from '@/features/files/types/file';
import * as React from 'react';
import * as documentAttachmentPrimitives from '@/features/files/components/document-attachment-primitives';

type DocumentDownloadItem = { kind: string; item: { id: string } };

export const useDocumentDownloads = (items: DocumentDownloadItem[]) => {
  const [downloadingDocumentIds, setDownloadingDocumentIds] = React.useState(
    () => new Set<string>()
  );

  const openDocument = React.useCallback(async (item: FileItem) => {
    const src = documentAttachmentPrimitives.getDocumentSource(item);
    if (!src) return;
    setDownloadingDocumentIds((current) => new Set(current).add(item.id));

    try {
      await downloadFile({
        fileName: documentAttachmentPrimitives.getDocumentName(item),
        mimeType: item.mimeType ?? undefined,
        url: src,
      });
    } catch {
      // noop
    } finally {
      setDownloadingDocumentIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  React.useEffect(() => {
    setDownloadingDocumentIds((current) => {
      const fileIds = new Set(
        items.filter((item) => item.kind === 'file').map((item) => item.item.id)
      );

      const next = new Set(
        [...current].filter((fileId) => fileIds.has(fileId))
      );

      if (
        next.size === current.size &&
        [...current].every((fileId) => next.has(fileId))
      ) {
        return current;
      }

      return next;
    });
  }, [items]);

  return { downloadingDocumentIds, openDocument };
};
