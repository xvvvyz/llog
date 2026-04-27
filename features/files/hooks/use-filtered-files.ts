import { FileItem } from '@/features/files/types/file';
import * as React from 'react';

const byOrder = (a: FileItem, b: FileItem) => (a.order ?? 0) - (b.order ?? 0);

export const useFilteredFiles = (files: FileItem[]) => {
  const audioMedia = React.useMemo(
    () => files.filter((m) => m.type === 'audio').sort(byOrder),
    [files]
  );

  const documentFiles = React.useMemo(
    () => files.filter((m) => m.type === 'document').sort(byOrder),
    [files]
  );

  const visualMedia = React.useMemo(
    () =>
      files
        .filter((m) => m.type === 'image' || m.type === 'video')
        .sort(byOrder),
    [files]
  );

  return { audioMedia, documentFiles, visualMedia };
};
