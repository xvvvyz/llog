import * as mediaLightboxRouteStore from '@/features/media/lib/media-lightbox-route-store';
import { type Media } from '@/features/media/types/media';
import { type Href, router } from 'expo-router';
import * as React from 'react';

export const useMediaLightbox = ({ media }: { media: Media[] }) => {
  const sourceIdRef = React.useRef<symbol>(Symbol('media-lightbox-source'));

  React.useEffect(() => {
    const sourceId = sourceIdRef.current;
    mediaLightboxRouteStore.setMediaLightboxRouteSource(sourceId, media);

    return () => {
      mediaLightboxRouteStore.removeMediaLightboxRouteSource(sourceId);
    };
  }, [media]);

  const openMediaLightbox = React.useCallback((nextMediaId: string) => {
    router.push(`/media/${encodeURIComponent(nextMediaId)}` as Href);
  }, []);

  const closeMediaLightbox = React.useCallback(() => {
    router.back();
  }, []);

  return {
    closeMediaLightbox,
    mediaLightbox: null as React.ReactElement | null,
    openMediaLightbox,
  };
};
