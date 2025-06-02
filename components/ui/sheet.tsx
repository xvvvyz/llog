import { Loading } from '@/components/ui/loading';
import { Portal } from '@rn-primitives/portal';
import React, { ReactNode, useEffect, useRef } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  Extrapolation,
  FadeOut,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetView,
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
        [0, 0.9],
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

export const Sheet = ({
  children,
  loading,
  portalName,
  open,
  ...props
}: BottomSheetModalProps & {
  children: ReactNode;
  loading?: boolean;
  portalName: string;
  open: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (open) ref.current?.present();
    else ref.current?.dismiss();
  }, [open]);

  return (
    <Portal name={portalName}>
      <BottomSheetModal
        accessibilityLabel="Bottom sheet"
        android_keyboardInputMode="adjustResize"
        animateOnMount
        backdropComponent={Backdrop}
        backgroundComponent={Background}
        bottomInset={insets.bottom}
        detached
        enableBlurKeyboardOnGesture={false}
        enablePanDownToClose
        handleComponent={null}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        ref={ref}
        {...props}
      >
        {loading && (
          <Animated.View
            className="absolute inset-0 z-10 rounded-t-3xl bg-popover"
            exiting={Platform.select({
              // https://github.com/facebook/react-native/issues/49077
              android: undefined,
              default: FadeOut.duration(150),
            })}
          >
            <Loading />
          </Animated.View>
        )}
        {children}
      </BottomSheetModal>
    </Portal>
  );
};

export const SheetView = BottomSheetView;
