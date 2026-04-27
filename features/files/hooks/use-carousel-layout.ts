import * as React from 'react';
import { LayoutChangeEvent, Platform } from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import type { ICarouselInstance } from 'react-native-reanimated-carousel';

const CAROUSEL_SWIPE_ACTIVATION_OFFSET_PX = 6;
const CAROUSEL_VERTICAL_SWIPE_ACTIVATION_OFFSET_PX = 10;

export const useCarouselLayout = ({
  activeIndex,
  carouselRef,
}: {
  activeIndex: number;
  carouselRef: React.RefObject<ICarouselInstance | null>;
}) => {
  const previousLayoutRef = React.useRef({ height: 0, width: 0 });
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);

  const [containerLayout, setContainerLayout] = React.useState({
    height: 0,
    width: 0,
  });

  const contentHeight = containerLayout.height;
  const contentWidth = containerLayout.width;

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;

    setContainerLayout((currentLayout) => {
      if (currentLayout.height === height && currentLayout.width === width) {
        return currentLayout;
      }

      return { height, width };
    });
  }, []);

  const handleConfigurePanGesture = React.useCallback(
    (panGesture: PanGesture) => {
      panGesture.activeOffsetX([
        -CAROUSEL_SWIPE_ACTIVATION_OFFSET_PX,
        CAROUSEL_SWIPE_ACTIVATION_OFFSET_PX,
      ]);

      if (Platform.OS !== 'web') return;

      panGesture
        .manualActivation(true)
        .onTouchesDown((event) => {
          'worklet';
          const touch = event.allTouches[0];
          if (!touch || event.numberOfTouches !== 1) return;
          gestureStartX.value = touch.absoluteX;
          gestureStartY.value = touch.absoluteY;
        })
        .onTouchesMove((event, stateManager) => {
          'worklet';
          const touch = event.allTouches[0];

          if (!touch || event.numberOfTouches !== 1) {
            stateManager.fail();
            return;
          }

          const translationX = touch.absoluteX - gestureStartX.value;
          const translationY = touch.absoluteY - gestureStartY.value;
          const absoluteTranslationX = Math.abs(translationX);
          const absoluteTranslationY = Math.abs(translationY);

          if (
            absoluteTranslationY >=
              CAROUSEL_VERTICAL_SWIPE_ACTIVATION_OFFSET_PX &&
            absoluteTranslationY > absoluteTranslationX
          ) {
            stateManager.fail();
            return;
          }

          if (
            absoluteTranslationX >= CAROUSEL_SWIPE_ACTIVATION_OFFSET_PX &&
            absoluteTranslationX > absoluteTranslationY
          ) {
            stateManager.activate();
          }
        });
    },
    [gestureStartX, gestureStartY]
  );

  React.useEffect(() => {
    if (contentWidth === 0 || contentHeight === 0) return;
    const previousLayout = previousLayoutRef.current;

    const hasLayoutChanged =
      previousLayout.width !== 0 &&
      (previousLayout.width !== contentWidth ||
        previousLayout.height !== contentHeight);

    previousLayoutRef.current = { height: contentHeight, width: contentWidth };
    if (!hasLayoutChanged) return;

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ animated: false, index: activeIndex });
    });
  }, [activeIndex, carouselRef, contentHeight, contentWidth]);

  return {
    contentHeight,
    contentWidth,
    handleConfigurePanGesture,
    handleLayout,
  };
};
