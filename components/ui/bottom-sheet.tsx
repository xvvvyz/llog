import { Loading } from '@/components/ui/loading';
import { noAndroid } from '@/utilities/no-android';
import { Portal } from '@rn-primitives/portal';
import { useRouter } from 'expo-router';
import { cssInterop } from 'nativewind';
import { ReactNode, useCallback, useRef } from 'react';
import { Platform, View } from 'react-native';

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
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';

const StyledBottomSheetBackdrop = cssInterop(BottomSheetBackdrop, {
  className: {
    target: 'style',
  },
});

const Backdrop = ({
  animatedIndex,
  style,
  ...props
}: BottomSheetBackdropProps) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <StyledBottomSheetBackdrop
      {...props}
      animatedIndex={animatedIndex}
      appearsOnIndex={0}
      className="bg-background/80"
      disappearsOnIndex={-1}
      pressBehavior="close"
      style={[style, containerAnimatedStyle]}
    />
  );
};

const Background = ({ style }: BottomSheetBackgroundProps) => {
  return <View className="flex-1 rounded-t-3xl bg-popover" style={style} />;
};

export const BottomSheet = ({
  children,
  isLoading,
}: {
  children: ReactNode;
  isLoading?: boolean;
}) => {
  const ref = useRef<BottomSheetPrimative>(null);
  const router = useRouter();

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) router.back();
    },
    [router]
  );

  const content = (
    <BottomSheetModalProvider>
      <BottomSheetPrimative
        animationConfigs={{ duration: 150 }}
        animateOnMount
        backdropComponent={Backdrop}
        backgroundComponent={Background}
        enableContentPanningGesture
        enablePanDownToClose
        handleComponent={null}
        onChange={handleSheetChanges}
        ref={ref}
        enableDynamicSizing
        enableHandlePanningGesture={false}
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
    </BottomSheetModalProvider>
  );

  return Platform.OS === 'ios' ? (
    content
  ) : (
    <Portal name="bottom-sheet">{content}</Portal>
  );
};
