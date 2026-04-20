import { BackButton } from '@/components/ui/back-button';
import { Carousel } from '@/components/ui/carousel';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useRecordMedia, useReplyMedia } from '@/queries/use-record-media';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Platform, View } from 'react-native';

export default function Index() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    replyId?: string;
    defaultIndex?: string;
    id?: string;
    recordId: string;
  }>();

  const record = useRecordMedia({
    id: params.replyId ? undefined : params.recordId,
  });

  const reply = useReplyMedia({ id: params.replyId });
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

    return params.defaultIndex ? Number(params.defaultIndex) : 0;
  }, [params.id, params.defaultIndex, visualMedia]);

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
    if (params.id) return <Loading />;
    return <Redirect href={`/record/${params.recordId}`} />;
  }

  return (
    <Page>
      <View
        className="absolute top-1 left-4 z-10 rounded-full md:top-3 md:left-8"
        style={{ marginTop: insets.top + 1 }}
      >
        <BackButton />
      </View>
      <Carousel
        defaultIndex={defaultIndex}
        media={visualMedia}
        isKeyboardNavigationEnabled={visualMedia.length > 1}
      />
    </Page>
  );
}
