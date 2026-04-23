import * as React from 'react';
import { View } from 'react-native';

import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedDotView = Animated.createAnimatedComponent(View);

const MAX_DOTS = 5;
const DOT_SIZE = 8;
const DOT_GAP = 8;
const DOT_STEP = DOT_SIZE + DOT_GAP;

export const CarouselDots = ({
  activeIndex,
  count,
}: {
  activeIndex: SharedValue<number>;
  count: number;
}) => {
  const visibleCount = Math.min(count, MAX_DOTS);
  const containerWidth = visibleCount * DOT_SIZE + (visibleCount - 1) * DOT_GAP;

  return (
    <View className="h-2 overflow-hidden" style={{ width: containerWidth }}>
      <Animated.View className="flex-row gap-2">
        {Array.from({ length: count }, (_, i) => (
          <CarouselDot
            activeIndex={activeIndex}
            count={count}
            index={i}
            key={i}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const CarouselDot = ({
  activeIndex,
  count,
  index,
}: {
  activeIndex: SharedValue<number>;
  count: number;
  index: number;
}) => {
  const style = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const half = Math.floor(MAX_DOTS / 2);
    const center = Math.max(half, Math.min(active, count - 1 - half));
    const offset = count <= MAX_DOTS ? 0 : -(center - half) * DOT_STEP;
    const dist = Math.abs(index - active);
    const clampedDist = Math.min(dist, 2);
    const scale = 1 - clampedDist * 0.25;
    const opacity = 1 - clampedDist * 0.3;
    const windowStart = center - half;
    const windowEnd = windowStart + MAX_DOTS - 1;

    const isVisible =
      count <= MAX_DOTS || (index >= windowStart && index <= windowEnd);

    return {
      opacity: isVisible ? opacity : 0,
      transform: [{ translateX: offset }, { scale }],
    };
  });

  return (
    <AnimatedDotView className="size-2" style={style}>
      <View className="bg-foreground h-full w-full rounded-full shadow-xl" />
    </AnimatedDotView>
  );
};
