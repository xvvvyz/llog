import * as React from 'react';
import { LayoutChangeEvent, Platform } from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import type { ICarouselInstance } from 'react-native-reanimated-carousel';

const IOS_BACK_SWIPE_EDGE_WIDTH = 44;

export const useCarouselLayout = ({
  activeIndex,
  carouselRef,
}: {
  activeIndex: number;
  carouselRef: React.RefObject<ICarouselInstance | null>;
}) => {
  const previousLayoutRef = React.useRef({ height: 0, width: 0 });

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
      if (Platform.OS !== 'ios') return;
      if (contentWidth <= IOS_BACK_SWIPE_EDGE_WIDTH) return;

      // keep the left edge free so iOS interactive-pop wins over carousel swipes.
      panGesture.hitSlop({
        right: 0,
        width: contentWidth - IOS_BACK_SWIPE_EDGE_WIDTH,
      });
    },
    [contentWidth]
  );

  React.useEffect(() => {
    if (contentWidth === 0 || contentHeight === 0) return;

    const previousLayout = previousLayoutRef.current;

    const hasLayoutChanged =
      previousLayout.width !== 0 &&
      (previousLayout.width !== contentWidth ||
        previousLayout.height !== contentHeight);

    previousLayoutRef.current = {
      height: contentHeight,
      width: contentWidth,
    };

    if (!hasLayoutChanged) return;

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        animated: false,
        index: activeIndex,
      });
    });
  }, [activeIndex, carouselRef, contentHeight, contentWidth]);

  return {
    contentHeight,
    contentWidth,
    handleConfigurePanGesture,
    handleLayout,
  };
};
