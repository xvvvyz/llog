import { Media } from '@/types/media';
import { useMemo } from 'react';

export const useFilteredMedia = (media: Media[]) => {
  const imageMedia = useMemo(
    () => media.filter((m) => m.type === 'image'),
    [media]
  );

  const audioMedia = useMemo(
    () => media.filter((m) => m.type === 'audio'),
    [media]
  );

  return { audioMedia, imageMedia };
};
