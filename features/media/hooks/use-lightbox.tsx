import { getRecordMediaHref } from '@/features/records/lib/route';
import { router } from 'expo-router';
import * as React from 'react';

export const useMediaLightbox = ({ recordId }: { recordId?: string }) => {
  const openMediaLightbox = React.useCallback(
    (nextMediaId: string) => {
      if (!recordId) return;
      router.push(getRecordMediaHref(recordId, nextMediaId));
    },
    [recordId]
  );

  const closeMediaLightbox = React.useCallback(() => {
    router.back();
  }, []);

  return { closeMediaLightbox, openMediaLightbox };
};
