import { Media } from '@/types/media';
import * as React from 'react';

const byOrder = (a: Media, b: Media) => (a.order ?? 0) - (b.order ?? 0);

export const useFilteredMedia = (media: Media[]) => {
  const audioMedia = React.useMemo(
    () => media.filter((m) => m.type === 'audio').sort(byOrder),
    [media]
  );

  const imageMedia = React.useMemo(
    () => media.filter((m) => m.type === 'image').sort(byOrder),
    [media]
  );

  const visualMedia = React.useMemo(
    () =>
      media
        .filter((m) => m.type === 'image' || m.type === 'video')
        .sort(byOrder),
    [media]
  );

  return { audioMedia, imageMedia, visualMedia };
};
