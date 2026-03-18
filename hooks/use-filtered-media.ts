import { Media } from '@/types/media';
import { useMemo } from 'react';

export const useFilteredMedia = (media: Media[]) => {
  const audioMedia = useMemo(
    () => media.filter((m) => m.type === 'audio'),
    [media]
  );

  const imageMedia = useMemo(
    () => media.filter((m) => m.type === 'image'),
    [media]
  );

  const visualMedia = useMemo(
    () => media.filter((m) => m.type === 'image' || m.type === 'video'),
    [media]
  );

  return { audioMedia, imageMedia, visualMedia };
};
