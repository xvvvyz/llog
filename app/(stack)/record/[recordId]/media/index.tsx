import { BackButton } from '@/components/ui/back-button';
import { Carousel } from '@/components/ui/carousel';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { useCommentMedia, useRecordMedia } from '@/queries/use-record-media';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    commentId?: string;
    defaultIndex: string;
    recordId: string;
  }>();

  const record = useRecordMedia({
    id: params.commentId ? undefined : params.recordId,
  });

  const comment = useCommentMedia({ id: params.commentId });
  const allMedia = params.commentId ? comment.media : record.media;

  const visualMedia = useMemo(
    () => allMedia.filter((m) => m.type === 'image' || m.type === 'video'),
    [allMedia]
  );

  const isLoading = params.commentId ? comment.isLoading : record.isLoading;
  const defaultIndex = params.defaultIndex ? Number(params.defaultIndex) : 0;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.back();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  if (!visualMedia.length || isNaN(defaultIndex)) {
    return <Redirect href={`/record/${params.recordId}`} />;
  }

  return (
    <Page>
      <View
        className="absolute left-4 top-1 z-10 rounded-full md:left-8 md:top-3"
        style={{ marginTop: insets.top + 1 }}
      >
        <BackButton />
      </View>
      <Carousel
        defaultIndex={defaultIndex}
        media={visualMedia}
        isKeyboardNavigationEnabled={visualMedia.length > 1}
        onClose={() => router.back()}
      />
    </Page>
  );
}
