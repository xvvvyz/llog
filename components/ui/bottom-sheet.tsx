import { Loading } from '@/components/ui/loading';
import { noAndroid } from '@/utilities/no-android';
import { Portal } from '@rn-primitives/portal';
import { useRouter } from 'expo-router';
import { ReactNode, useCallback, useRef } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  Extrapolation,
  FadeOut,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { useOnEscape } from '@/hooks/use-on-escape';
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

export const BottomSheet = ({
  children,
  isLoading,
}: {
  children: ReactNode;
  isLoading?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetPrimative>(null);
  const router = useRouter();

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index >= 0) return;
      router.back();
    },
    [router]
  );

  useOnEscape(() => ref.current?.close());

  const content = (
    <BottomSheetPrimative
      accessibilityLabel="Bottom sheet"
      animateOnMount
      backdropComponent={Backdrop}
      backgroundComponent={Background}
      bottomInset={insets.bottom}
      detached
      enableContentPanningGesture
      enableDynamicSizing
      enableHandlePanningGesture={false}
      enablePanDownToClose
      handleComponent={null}
      onChange={handleSheetChanges}
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
  );

  return Platform.OS === 'ios' ? (
    content
  ) : (
    <Portal name="bottom-sheet">{content}</Portal>
  );
};
