import { BackButton } from '@/components/ui/back-button';
import { Carousel } from '@/components/ui/carousel';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { useRecordImages } from '@/queries/use-record-images';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    defaultIndex: string;
    recordId: string;
  }>();

  const record = useRecordImages({ id: params.recordId });
  const defaultIndex = params.defaultIndex ? Number(params.defaultIndex) : 0;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.back();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (record.isLoading) {
    return <Loading />;
  }

  if (!record.images.length || isNaN(defaultIndex)) {
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
        images={record.images}
        isKeyboardNavigationEnabled={record.images.length > 1}
      />
    </Page>
  );
}
