import { Image } from '@/components/ui/image';
import { VideoPlayer } from '@/components/ui/video-player';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gallery, type GalleryRefType } from 'react-native-zoom-toolkit';

export const Carousel = ({
  className,
  defaultIndex = 0,
  media,
  isKeyboardNavigationEnabled = false,
  onClose,
}: {
  className?: string;
  defaultIndex?: number;
  media: Media[];
  isKeyboardNavigationEnabled?: boolean;
  onClose?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<GalleryRefType>(null);
  const windowDimensions = useWindowDimensions();
  const activeIndex = useSharedValue(defaultIndex);

  useEffect(() => {
    if (!isKeyboardNavigationEnabled || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        ref.current?.setIndex(Math.max(0, activeIndex.value - 1));
      } else if (event.key === 'ArrowRight') {
        ref.current?.setIndex(
          Math.min(media.length - 1, activeIndex.value + 1)
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardNavigationEnabled, media.length, activeIndex]);

  const renderItem = useCallback(
    (item: Media) => {
      if (item.type === 'video') {
        return (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VideoPlayer
              maxHeight={windowDimensions.height}
              maxWidth={windowDimensions.width}
              uri={item.uri}
            />
          </View>
        );
      }

      return (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Image
            maxHeight={windowDimensions.height}
            maxWidth={windowDimensions.width}
            uri={item.uri}
          />
        </View>
      );
    },
    [windowDimensions.height, windowDimensions.width]
  );

  return (
    <View className={cn('relative flex-1', className)}>
      <Gallery
        data={media}
        initialIndex={defaultIndex}
        keyExtractor={(item) => item.id}
        onIndexChange={(index) => {
          activeIndex.value = index;
        }}
        onSwipe={(direction) => {
          if (direction === 'up' && onClose) onClose();
        }}
        ref={ref}
        renderItem={renderItem}
        zoomEnabled={media.length > 0}
      />
      {media.length > 1 && (
        <PaginationDots
          activeIndex={activeIndex}
          count={media.length}
          marginBottom={insets.bottom}
          onDotPress={(index) => ref.current?.setIndex(index)}
        />
      )}
    </View>
  );
};

const PaginationDots = ({
  activeIndex,
  count,
  marginBottom,
  onDotPress,
}: {
  activeIndex: SharedValue<number>;
  count: number;
  marginBottom: number;
  onDotPress: (index: number) => void;
}) => {
  return (
    <View
      className="absolute bottom-8 left-0 right-0 flex-row items-center justify-center gap-2"
      style={{ marginBottom }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot
          activeIndex={activeIndex}
          index={i}
          key={i}
          onPress={() => onDotPress(i)}
        />
      ))}
    </View>
  );
};

const Dot = ({
  activeIndex,
  index,
  onPress,
}: {
  activeIndex: SharedValue<number>;
  index: number;
  onPress: () => void;
}) => {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(activeIndex.value === index ? 1 : 0.5, {
      duration: 200,
    }),
  }));

  return (
    <Pressable hitSlop={8} onPress={onPress}>
      <Animated.View
        className="h-2 w-2 rounded-full bg-foreground shadow-xl"
        style={style}
      />
    </Pressable>
  );
};
