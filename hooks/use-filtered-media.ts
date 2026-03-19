import { Media } from '@/types/media';
import { useMemo } from 'react';

const byOrder = (a: Media, b: Media) => (a.order ?? 0) - (b.order ?? 0);

export const useFilteredMedia = (media: Media[]) => {
  const audioMedia = useMemo(
    () => media.filter((m) => m.type === 'audio').sort(byOrder),
    [media]
  );

  const imageMedia = useMemo(
    () => media.filter((m) => m.type === 'image').sort(byOrder),
    [media]
  );

  const visualMedia = useMemo(
    () =>
      media
        .filter((m) => m.type === 'image' || m.type === 'video')
        .sort(byOrder),
    [media]
  );

  return { audioMedia, imageMedia, visualMedia };
};
