import { ImagesListItem } from '@/components/images-list-item';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Sheet } from '@/components/ui/sheet';
import { Text, TextContext } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useRecordImages } from '@/queries/use-record-images';
import { LegendListRef } from '@legendapp/list';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Platform, View } from 'react-native';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export const ImagesSheet = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isPaginatingRef = useRef(false);
  const listRef = useRef<LegendListRef>(null);
  const sheetManager = useSheetManager();
  const windowDimensions = useWindowDimensions();

  const isOpen = sheetManager.isOpen('record-images');
  const imageId = sheetManager.getContext('record-images');
  const recordId = sheetManager.getId('record-images');

  const record = useRecordImages({ id: recordId });

  const isLoading = !!recordId && record.id !== recordId;

  const goToPrevious = useCallback(() => {
    if (isPaginatingRef.current) return;
    isPaginatingRef.current = true;
    setCurrentIndex((c) => (c === 0 ? record.images.length - 1 : c - 1));
    setTimeout(() => (isPaginatingRef.current = false), 100);
  }, [record.images.length]);

  const goToNext = useCallback(() => {
    if (isPaginatingRef.current) return;
    isPaginatingRef.current = true;
    setCurrentIndex((c) => (c === record.images.length - 1 ? 0 : c + 1));
    setTimeout(() => (isPaginatingRef.current = false), 100);
  }, [record.images.length]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen || record.images.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, record.images.length, isOpen]);

  useEffect(() => {
    if (!record.images.length) return;
    const newIndex = record.images.findIndex((image) => image.id === imageId);
    setCurrentIndex(newIndex >= 0 ? newIndex : 0);
    if (!listRef.current) return;
    listRef.current.scrollToIndex({ index: newIndex });
  }, [record.images, imageId]);

  useLayoutEffect(() => {
    if (!listRef.current || !record.images.length) return;
    listRef.current.scrollToIndex({ index: currentIndex });
  }, [currentIndex, record.images.length]);

  return (
    <Sheet
      className="absolute inset-0 justify-center rounded-none bg-background"
      detached
      loading={isLoading}
      loadingClassName="rounded-none bg-background"
      onDismiss={() => sheetManager.close('record-images')}
      open={isOpen}
      portalName="record-images"
    >
      {!isLoading && !!record.images.length && (
        <List
          data={record.images}
          estimatedItemSize={windowDimensions.width}
          horizontal
          keyExtractor={(image) => image.id}
          listRef={listRef}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <ImagesListItem
              image={item}
              maxHeight={windowDimensions.height}
              maxWidth={windowDimensions.width}
            />
          )}
          showsHorizontalScrollIndicator={false}
        />
      )}
      {!isLoading && record.images.length > 1 && (
        <View className="absolute bottom-8 left-0 right-0 items-center">
          <View className="flex-row items-center justify-center rounded-full bg-background/50 p-1">
            <Button
              className="size-6"
              onPress={goToPrevious}
              size="icon"
              variant="link"
            >
              <Icon icon={ChevronLeft} size={20} />
            </Button>
            <View className="flex-row">
              <TextContext.Provider value="text-sm">
                <Text className="w-6 text-right">{currentIndex + 1}</Text>
                <Text className="w-4 text-center">/</Text>
                <Text className="w-6">{record.images.length}</Text>
              </TextContext.Provider>
            </View>
            <Button
              className="size-6"
              onPress={goToNext}
              size="icon"
              variant="link"
            >
              <Icon icon={ChevronRight} size={20} />
            </Button>
          </View>
        </View>
      )}
    </Sheet>
  );
};
