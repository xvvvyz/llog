import { Lightbox } from '@/features/media/components/lightbox';
import { useLightboxMedia } from '@/features/media/queries/use-lightbox-items';
import * as recordRoutes from '@/features/records/lib/route';
import { useDelayedTrue } from '@/hooks/use-delayed-true';
import { Loading } from '@/ui/loading';
import { NotFound } from '@/ui/not-found';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function MediaLightboxRoute() {
  const params = useLocalSearchParams<{
    mediaId?: string;
    recordId?: string;
  }>();

  const routeMediaId = getRouteParam(params.mediaId);
  const routeRecordId = getRouteParam(params.recordId);

  const { isLoading, media } = useLightboxMedia({
    mediaId: routeMediaId,
    recordId: routeRecordId,
  });

  const [visibleMediaId, setVisibleMediaId] = React.useState(routeMediaId);
  const shouldShowLoadingIndicator = useDelayedTrue(isLoading);
  const addressMediaIdRef = React.useRef(routeMediaId);
  const shouldGoBackAfterCloseRef = React.useRef(false);

  React.useEffect(() => {
    setVisibleMediaId(routeMediaId);
    addressMediaIdRef.current = routeMediaId;
  }, [routeMediaId]);

  const exitRoute = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(
      routeRecordId ? recordRoutes.getRecordDetailHref(routeRecordId) : '/'
    );
  }, [routeRecordId]);

  const handleActiveMediaChange = React.useCallback(
    (nextMediaId: string) => {
      if (!routeRecordId || nextMediaId === addressMediaIdRef.current) return;

      const nextHref = recordRoutes.getRecordMediaHref(
        routeRecordId,
        nextMediaId
      );

      addressMediaIdRef.current = nextMediaId;

      if (typeof window !== 'undefined') {
        window.history.replaceState(
          window.history.state,
          '',
          nextHref as string
        );

        return;
      }

      router.replace(nextHref);
    },
    [routeRecordId]
  );

  const handleRequestClose = React.useCallback(() => {
    shouldGoBackAfterCloseRef.current = true;
    setVisibleMediaId(undefined);
  }, []);

  const handleCloseAnimationEnd = React.useCallback(() => {
    if (!shouldGoBackAfterCloseRef.current) return;
    shouldGoBackAfterCloseRef.current = false;
    exitRoute();
  }, [exitRoute]);

  const hasRouteMedia = media.some((item) => item.id === routeMediaId);

  if (!routeMediaId || !routeRecordId || (!isLoading && !hasRouteMedia)) {
    return <NotFound className="absolute inset-0 bg-background" />;
  }

  if (isLoading) {
    return (
      <View className="absolute inset-0 bg-background">
        {shouldShowLoadingIndicator ? <Loading /> : null}
      </View>
    );
  }

  return (
    <Lightbox
      media={media}
      mediaId={visibleMediaId}
      onActiveMediaChange={handleActiveMediaChange}
      onCloseAnimationEnd={handleCloseAnimationEnd}
      onRequestClose={handleRequestClose}
    />
  );
}
