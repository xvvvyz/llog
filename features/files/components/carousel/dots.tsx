import { cn } from '@/lib/cn';
import { Pressable, View } from 'react-native';

import Animated, {
  createAnimatedComponent,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const AnimatedDotView = createAnimatedComponent(View);
const MAX_DOTS = 5;

const DOT_SIZES = {
  default: { gap: 8, size: 8 },
  sm: { gap: 6, size: 6 },
} as const;

type DotSize = keyof typeof DOT_SIZES;

export const Dots = ({
  activeIndex,
  count,
  onIndexPress,
  size = 'default',
}: {
  activeIndex: SharedValue<number>;
  count: number;
  onIndexPress?: (index: number) => void;
  size?: DotSize;
}) => {
  const dotSize = DOT_SIZES[size];
  const dotStep = dotSize.size + dotSize.gap;
  const visibleCount = Math.min(count, MAX_DOTS);

  const containerWidth =
    visibleCount * dotSize.size + (visibleCount - 1) * dotSize.gap;

  return (
    <View
      className={cn('overflow-hidden', onIndexPress && 'pointer-events-auto')}
      style={{ height: dotSize.size, width: containerWidth }}
    >
      <Animated.View
        className={cn(size === 'sm' ? 'flex-row gap-1.5' : 'flex-row gap-2')}
      >
        {Array.from({ length: count }, (_, i) => (
          <CarouselDot
            key={i}
            activeIndex={activeIndex}
            count={count}
            dotStep={dotStep}
            index={i}
            onPress={onIndexPress ? () => onIndexPress(i) : undefined}
            size={size}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const CarouselDot = ({
  activeIndex,
  count,
  dotStep,
  index,
  onPress,
  size,
}: {
  activeIndex: SharedValue<number>;
  count: number;
  dotStep: number;
  index: number;
  onPress?: () => void;
  size: DotSize;
}) => {
  const style = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const half = Math.floor(MAX_DOTS / 2);
    const center = Math.max(half, Math.min(active, count - 1 - half));
    const offset = count <= MAX_DOTS ? 0 : -(center - half) * dotStep;
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
    <AnimatedDotView
      className={cn(size === 'sm' ? 'size-1.5' : 'size-2')}
      style={style}
    >
      {onPress ? (
        <Pressable
          accessibilityLabel={`Go to carousel item ${index + 1}`}
          className="h-full w-full"
          hitSlop={8}
          onPress={onPress}
          role="button"
        >
          <View className="h-full w-full border-continuous rounded-full bg-popover-foreground shadow-xl" />
        </Pressable>
      ) : (
        <View className="h-full w-full border-continuous rounded-full bg-popover-foreground shadow-xl" />
      )}
    </AnimatedDotView>
  );
};
