import { Button } from '@/components/ui/button';
import { Carousel } from '@/components/ui/carousel';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { useSheetManager } from '@/context/sheet-manager';
import { useRecordImages } from '@/queries/use-record-images';
import { X } from 'lucide-react-native';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ImagesSheet = () => {
  const insets = useSafeAreaInsets();
  const sheetManager = useSheetManager();

  const imageId = sheetManager.getContext('record-images');
  const isOpen = sheetManager.isOpen('record-images');
  const recordId = sheetManager.getId('record-images');

  const record = useRecordImages({ id: recordId });
  const isLoading = !!recordId && record.id !== recordId;

  const defaultIndex = useMemo(
    () =>
      Math.max(
        0,
        record.images.findIndex((image) => image.id === imageId)
      ),
    [imageId, record.images]
  );

  return (
    <Sheet
      className="absolute inset-0 items-center justify-center rounded-none border-0 bg-black"
      detached
      loading={isLoading}
      loadingClassName="rounded-none bg-background"
      onDismiss={() => sheetManager.close('record-images')}
      open={isOpen}
      portalName="record-images"
    >
      <Button
        className="size-11 rounded-full bg-black/60"
        onPress={() => sheetManager.close('record-images')}
        size="icon"
        style={{ marginTop: insets.top }}
        variant="link"
        wrapperClassName="absolute right-4 top-1 z-10 rounded-full"
      >
        <Icon className="text-white" icon={X} />
      </Button>
      <Carousel
        defaultIndex={defaultIndex}
        images={record.images}
        isKeyboardNavigationEnabled={isOpen && record.images.length > 1}
      />
    </Sheet>
  );
};
