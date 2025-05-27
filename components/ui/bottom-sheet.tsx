import { Loading } from '@/components/ui/loading';
import { Portal } from '@rn-primitives/portal';
import React, { ReactNode, useRef } from 'react';
import { Keyboard, Platform, View } from 'react-native';
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
  BottomSheetProps,
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

export const BottomSheet = ({
  children,
  portalName,
  ...props
}: BottomSheetProps & {
  children: ReactNode;
  portalName: string;
}) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetPrimative>(null);

  return (
    <Portal name={portalName}>
      <BottomSheetPrimative
        accessibilityLabel="Bottom sheet"
        animateOnMount
        backdropComponent={Backdrop}
        backgroundComponent={Background}
        bottomInset={insets.bottom}
        detached
        enableBlurKeyboardOnGesture={false}
        enablePanDownToClose
        handleComponent={null}
        keyboardBlurBehavior="restore"
        ref={ref}
        {...props}
      >
        {children}
      </BottomSheetPrimative>
    </Portal>
  );
};

export const BottomSheetLoading = () => {
  return (
    <Animated.View
      className="absolute inset-0 rounded-t-3xl bg-popover"
      exiting={Platform.select({
        // https://github.com/facebook/react-native/issues/49077
        android: undefined,
        default: FadeOut.duration(150),
      })}
    >
      <Loading />
    </Animated.View>
  );
};
