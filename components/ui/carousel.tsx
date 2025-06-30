import { Image } from '@/components/ui/image';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { Image as ImageType } from '@/types/image';
import { cn } from '@/utilities/cn';
import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CarouselPrimitive, {
  ICarouselInstance,
  Pagination as PaginationPrimitive,
} from 'react-native-reanimated-carousel';

const Pagination = cssInterop(PaginationPrimitive.Basic, {
  activeDotClassName: 'activeDotStyle',
  containerClassName: 'containerStyle',
  dotClassName: 'dotStyle',
});

export const Carousel = ({
  className,
  defaultIndex = 0,
  images,
  isKeyboardNavigationEnabled = false,
}: {
  className?: string;
  defaultIndex?: number;
  images: ImageType[];
  isKeyboardNavigationEnabled?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue<number>(0);
  const ref = useRef<ICarouselInstance>(null);
  const windowDimensions = useWindowDimensions();

  useEffect(() => {
    if (!isKeyboardNavigationEnabled || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') ref.current?.prev();
      else if (event.key === 'ArrowRight') ref.current?.next();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardNavigationEnabled]);

  return (
    <View className={cn('relative', className)}>
      <CarouselPrimitive
        data={images}
        defaultIndex={defaultIndex}
        enabled={images.length > 1}
        height={windowDimensions.height}
        onProgressChange={progress}
        ref={ref}
        renderItem={({ item }) => (
          <View className="size-full items-center justify-center">
            <Image
              maxHeight={windowDimensions.height}
              maxWidth={windowDimensions.width}
              uri={item.uri}
            />
          </View>
        )}
        width={windowDimensions.width}
      />
      {images.length > 1 && (
        <Pagination
          activeDotClassName="!bg-white"
          containerClassName="absolute gap-3 bottom-8"
          containerStyle={{ marginBottom: insets.bottom }}
          data={images}
          dotClassName="bg-white/60 shadow rounded-full"
          onPress={(index) =>
            ref.current?.scrollTo({
              count: index - progress.value,
              animated: true,
            })
          }
          progress={progress}
        />
      )}
    </View>
  );
};
