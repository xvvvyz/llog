import { Carousel } from '@/features/media/components/carousel';
import * as recordMediaQueries from '@/features/records/queries/use-record-media';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { clampIndex } from '@/lib/clamp';
import { BackButton } from '@/ui/back-button';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Platform, StatusBar, View } from 'react-native';

export default function Index() {
  const insets = useSafeAreaInsets();
  const [isUiHidden, setIsUiHidden] = React.useState(false);

  const params = useLocalSearchParams<{
    replyId?: string;
    defaultIndex?: string;
    id?: string;
    recordId: string;
  }>();

  const record = recordMediaQueries.useRecordMedia({
    id: params.replyId ? undefined : params.recordId,
  });

  const reply = recordMediaQueries.useReplyMedia({ id: params.replyId });
  const allMedia = params.replyId ? reply.media : record.media;

  const visualMedia = React.useMemo(
    () =>
      allMedia
        .filter((m) => m.type === 'image' || m.type === 'video')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allMedia]
  );

  const isLoading = params.replyId ? reply.isLoading : record.isLoading;

  const defaultIndex = React.useMemo(() => {
    if (params.id) {
      const idx = visualMedia.findIndex((m) => m.id === params.id);
      if (idx !== -1) return idx;
    }

    const parsedIndex = params.defaultIndex
      ? Number.parseInt(params.defaultIndex, 10)
      : 0;

    return clampIndex(parsedIndex, visualMedia.length);
  }, [params.id, params.defaultIndex, visualMedia]);

  const carouselKey = React.useMemo(
    () =>
      params.id ??
      `record-media:${params.replyId ?? params.recordId}:${defaultIndex}`,
    [defaultIndex, params.id, params.recordId, params.replyId]
  );

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();

        const onKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'Escape') e.stopImmediatePropagation();
          document.removeEventListener('keyup', onKeyUp, true);
        };

        document.addEventListener('keyup', onKeyUp, true);
        router.back();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  if (!visualMedia.length) {
    return <Redirect href={`/record/${params.recordId}`} />;
  }

  return (
    <React.Fragment>
      {Platform.OS !== 'web' ? <StatusBar animated hidden /> : null}
      <Page>
        {!isUiHidden && (
          <View
            className="absolute top-1 left-4 z-10 rounded-full md:top-3 md:left-8"
            style={{ marginTop: insets.top + 1 }}
          >
            <BackButton />
          </View>
        )}
        <Carousel
          key={carouselKey}
          defaultIndex={defaultIndex}
          onUiHiddenChange={setIsUiHidden}
          media={visualMedia}
          isKeyboardNavigationEnabled={visualMedia.length > 1}
        />
      </Page>
    </React.Fragment>
  );
}
