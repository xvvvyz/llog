import { Loading } from '@/components/ui/loading';
import { useOnEscape } from '@/hooks/use-on-escape';
import { noAndroid } from '@/utilities/no-android';
import { Portal } from '@rn-primitives/portal';
import { ReactNode, useRef } from 'react';
import { Keyboard, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  Extrapolation,
  FadeOut,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import BottomSheetPrimative, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';

const Backdrop = ({
  animatedIndex,
  style,
  ...props
}: BottomSheetBackdropProps) => {
  const animatedOpacity = useAnimatedStyle(() => {
    'worklet';

    return {
      opacity: interpolate(
        animatedIndex.value,
        [-1, 0],
        [0, 0.95],
        Extrapolation.CLAMP
      ),
    };
  }, []);

  return (
    <BottomSheetBackdrop
      {...props}
      animatedIndex={animatedIndex}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      onPress={Keyboard.dismiss}
      opacity={1}
      pressBehavior="close"
      style={[style, { backgroundColor: 'rgba(0, 0, 0, 0)' }]}
    >
      <Animated.View
        className="absolute inset-0 bg-background"
        style={animatedOpacity}
      />
    </BottomSheetBackdrop>
  );
};

const Background = ({ style, ...props }: BottomSheetBackgroundProps) => {
  return (
    <View
      {...props}
      className="-mb-64 rounded-t-3xl bg-popover"
      style={[style, { borderCurve: 'continuous' }]}
    />
  );
};

const Handle = () => {
  return (
    <View className="flex-row justify-center pt-3">
      <View className="h-1 w-8 rounded-full bg-placeholder" />
    </View>
  );
};

export const BottomSheet = ({
  children,
  isLoading,
  onClose,
  open,
}: {
  children: ReactNode;
  isLoading?: boolean;
  onClose?: () => void;
  open?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetPrimative>(null);

  useOnEscape(() => ref.current?.close());
  if (!open) return null;

  return (
    <Portal name="bottom-sheet">
      <BottomSheetPrimative
        accessibilityLabel="Bottom sheet"
        animateOnMount
        backdropComponent={Backdrop}
        backgroundComponent={Background}
        bottomInset={insets.bottom}
        detached
        enableContentPanningGesture
        enableHandlePanningGesture
        enablePanDownToClose
        handleComponent={Handle}
        keyboardBlurBehavior="restore"
        onClose={onClose}
        ref={ref}
      >
        {children}
        {isLoading && (
          <Animated.View
            className="absolute inset-0 rounded-t-3xl bg-popover"
            exiting={noAndroid(FadeOut.duration(150))}
          >
            <Loading />
          </Animated.View>
        )}
      </BottomSheetPrimative>
    </Portal>
  );
};
