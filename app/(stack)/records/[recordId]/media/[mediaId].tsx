import { MediaLightbox } from '@/features/media/components/media-lightbox';
import { useLightboxMedia } from '@/features/media/queries/use-lightbox-media';
import { Button } from '@/ui/button';
import { Loading } from '@/ui/loading';
import { Text } from '@/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import {
  getRecordDetailHref,
  getRecordMediaHref,
} from '@/features/records/lib/record-detail-route';

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

    router.replace(routeRecordId ? getRecordDetailHref(routeRecordId) : '/');
  }, [routeRecordId]);

  const handleActiveMediaChange = React.useCallback(
    (nextMediaId: string) => {
      if (!routeRecordId || nextMediaId === addressMediaIdRef.current) return;
      const nextHref = getRecordMediaHref(routeRecordId, nextMediaId);
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
    return (
      <View className="absolute inset-0 p-6 bg-background gap-4 items-center justify-center">
        <Text className="text-center text-muted-foreground">
          Media not found.
        </Text>
        <Button onPress={exitRoute} size="sm" variant="secondary">
          <Text>Close</Text>
        </Button>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="absolute inset-0 bg-background">
        <Loading />
      </View>
    );
  }

  return (
    <MediaLightbox
      media={media}
      mediaId={visibleMediaId}
      onActiveMediaChange={handleActiveMediaChange}
      onCloseAnimationEnd={handleCloseAnimationEnd}
      onRequestClose={handleRequestClose}
    />
  );
}
