import { Lightbox } from '@/features/files/components/lightbox';
import { useLightboxMedia } from '@/features/files/queries/use-lightbox-items';
import * as recordRoutes from '@/features/records/lib/route';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useDelayedTrue } from '@/hooks/use-delayed-true';
import { Loading } from '@/ui/loading';
import { NotFound } from '@/ui/not-found';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

const getRouteParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function MediaLightboxRoute() {
  const params = useLocalSearchParams<{ fileId?: string; recordId?: string }>();
  const routeFileId = getRouteParam(params.fileId);
  const routeRecordId = getRouteParam(params.recordId);

  const { isLoading, media, teamId } = useLightboxMedia({
    mediaId: routeFileId,
    recordId: routeRecordId,
  });

  const myRole = useMyRole({ teamId });
  const [visibleMediaId, setVisibleMediaId] = React.useState(routeFileId);
  const shouldShowLoadingIndicator = useDelayedTrue(isLoading);
  const addressMediaIdRef = React.useRef(routeFileId);
  const shouldGoBackAfterCloseRef = React.useRef(false);

  React.useEffect(() => {
    setVisibleMediaId(routeFileId);
    addressMediaIdRef.current = routeFileId;
  }, [routeFileId]);

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

  const hasRouteMedia = media.some((item) => item.id === routeFileId);

  if (!routeFileId || !routeRecordId || (!isLoading && !hasRouteMedia)) {
    return <NotFound className="absolute inset-0 bg-popover" />;
  }

  if (isLoading) {
    return (
      <View className="absolute inset-0 bg-popover">
        {shouldShowLoadingIndicator && <Loading className="bg-popover" />}
      </View>
    );
  }

  return (
    <Lightbox
      canAnalyzeAudio={myRole.canManage}
      media={media}
      mediaId={visibleMediaId}
      onActiveMediaChange={handleActiveMediaChange}
      onCloseAnimationEnd={handleCloseAnimationEnd}
      onRequestClose={handleRequestClose}
    />
  );
}
