import { FileItem } from '@/features/files/types/file';
import * as React from 'react';

export const useCarouselPreloading = ({
  activeIndexRef,
  getClampedIndex,
  files,
}: {
  activeIndexRef: React.RefObject<number>;
  getClampedIndex: (index: number) => number;
  files: FileItem[];
}) => {
  const loadedMediaIdsRef = React.useRef(new Set<string>());

  const [isActiveMediaLoading, setIsActiveMediaLoading] = React.useState(() => {
    const activeFileId = files[activeIndexRef.current]?.id;
    return activeFileId ? !loadedMediaIdsRef.current.has(activeFileId) : false;
  });

  const syncActiveMediaLoadingState = React.useCallback(
    (index: number) => {
      if (files.length === 0) {
        setIsActiveMediaLoading(false);
        return;
      }

      const safeIndex = getClampedIndex(index);
      const fileId = files[safeIndex]?.id;

      setIsActiveMediaLoading(
        Boolean(fileId) && !loadedMediaIdsRef.current.has(fileId)
      );
    },
    [getClampedIndex, files]
  );

  const handleActiveMediaLoad = React.useCallback(
    (fileId: string, _index: number) => {
      loadedMediaIdsRef.current.add(fileId);
      if (files[activeIndexRef.current]?.id !== fileId) return;
      setIsActiveMediaLoading(false);
    },
    [activeIndexRef, files]
  );

  React.useEffect(() => {
    const fileIdSet = new Set(files.map((item) => item.id));

    loadedMediaIdsRef.current.forEach((fileId) => {
      if (!fileIdSet.has(fileId)) loadedMediaIdsRef.current.delete(fileId);
    });

    syncActiveMediaLoadingState(activeIndexRef.current);
  }, [activeIndexRef, files, syncActiveMediaLoadingState]);

  return {
    handleActiveMediaLoad,
    isActiveMediaLoading,
    syncActiveMediaLoadingState,
  };
};
