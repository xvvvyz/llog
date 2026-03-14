import { ReactNode, useCallback } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';

const DOUBLE_TAP_SCALE = 2.5;
const PAN_MARGIN = 50;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

export const ZoomableView = ({
  children,
  onZoomChange,
}: {
  children: ReactNode;
  isZoomed?: boolean;
  onZoomChange: (isZoomed: boolean) => void;
}) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);

  const setZoomed = useCallback(
    (zoomed: boolean) => onZoomChange(zoomed),
    [onZoomChange]
  );

  const getMax = (containerSize: number) => {
    'worklet';
    return ((DOUBLE_TAP_SCALE - 1) * containerSize) / 2 + PAN_MARGIN;
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    runOnJS(setZoomed)(false);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    containerWidth.value = e.nativeEvent.layout.width;
    containerHeight.value = e.nativeEvent.layout.height;
  };

  const doubleTap = Gesture.Tap()
    .maxDistance(20)
    .numberOfTaps(2)
    .minPointers(1)
    .onEnd((e) => {
      if (scale.value > 1) {
        reset();
      } else {
        const offsetX = e.x - containerWidth.value / 2;
        const offsetY = e.y - containerHeight.value / 2;
        const tx = -offsetX * (DOUBLE_TAP_SCALE - 1);
        const ty = -offsetY * (DOUBLE_TAP_SCALE - 1);
        const maxX = getMax(containerWidth.value);
        const maxY = getMax(containerHeight.value);

        scale.value = withTiming(DOUBLE_TAP_SCALE);
        translateX.value = withTiming(clamp(tx, -maxX, maxX));
        translateY.value = withTiming(clamp(ty, -maxY, maxY));
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        runOnJS(setZoomed)(true);
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .minDistance(5)
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;

      const maxX = getMax(containerWidth.value);
      const maxY = getMax(containerHeight.value);

      translateX.value = clamp(
        savedTranslateX.value + e.translationX,
        -maxX,
        maxX
      );
      translateY.value = clamp(
        savedTranslateY.value + e.translationY,
        -maxY,
        maxY
      );
    })
    .onEnd((e) => {
      if (scale.value <= 1) return;

      const maxX = getMax(containerWidth.value);
      const maxY = getMax(containerHeight.value);

      translateX.value = withDecay(
        { velocity: e.velocityX, deceleration: 0.985, clamp: [-maxX, maxX] },
        () => (savedTranslateX.value = translateX.value)
      );
      translateY.value = withDecay(
        { velocity: e.velocityY, deceleration: 0.985, clamp: [-maxY, maxY] },
        () => (savedTranslateY.value = translateY.value)
      );
    });

  const gesture = Gesture.Exclusive(doubleTap, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            { flex: 1, alignItems: 'center', justifyContent: 'center' },
            animatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
