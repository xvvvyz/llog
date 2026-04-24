import { MediaLightbox } from '@/features/media/components/media-lightbox';
import { useMediaLightboxRouteMedia } from '@/features/media/lib/media-lightbox-route-store';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function MediaLightboxRoute() {
  const params = useLocalSearchParams<{ mediaId?: string }>();
  const routeMediaId = getRouteParam(params.mediaId);
  const media = useMediaLightboxRouteMedia(routeMediaId);
  const [visibleMediaId, setVisibleMediaId] = React.useState(routeMediaId);
  const shouldGoBackAfterCloseRef = React.useRef(false);

  React.useEffect(() => {
    setVisibleMediaId(routeMediaId);
  }, [routeMediaId]);

  const handleRequestClose = React.useCallback(() => {
    shouldGoBackAfterCloseRef.current = true;
    setVisibleMediaId(undefined);
  }, []);

  const handleCloseAnimationEnd = React.useCallback(() => {
    if (!shouldGoBackAfterCloseRef.current) return;
    shouldGoBackAfterCloseRef.current = false;
    router.back();
  }, []);

  if (!routeMediaId || media.length === 0) return null;

  return (
    <MediaLightbox
      media={media}
      mediaId={visibleMediaId}
      onCloseAnimationEnd={handleCloseAnimationEnd}
      onRequestClose={handleRequestClose}
    />
  );
}
