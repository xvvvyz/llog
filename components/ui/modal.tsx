import { Loading } from '@/components/ui/loading';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { noAndroid } from '@/utilities/no-android';
import { cva, type VariantProps } from 'class-variance-authority';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated';

const modalVariants = cva('w-full cursor-default bg-popover overflow-hidden', {
  defaultVariants: {
    variant: 'sheet',
  },
  variants: {
    variant: {
      alert: 'max-w-md rounded-3xl',
      sheet: 'rounded-t-3xl',
    },
  },
});

export const Modal = ({
  children,
  className,
  isLoading,
  variant = 'sheet',
}: {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
} & VariantProps<typeof modalVariants>) => {
  const insets = useSafeAreaInsets();
  const isSheet = variant === 'sheet';

  return (
    <View className="flex-1">
      {/* won't animate with the keyboard until this is fixed:
          https://github.com/facebook/react-native/issues/47625 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className={cn(
          'flex-1 items-center overflow-hidden',
          isSheet ? 'justify-end' : 'justify-center p-8'
        )}
      >
        <Pressable
          className="absolute inset-0 cursor-default"
          onPress={router.back}
        >
          <Animated.View
            className="h-full w-full"
            entering={noAndroid(FadeIn.duration(100))}
            exiting={noAndroid(FadeOut.duration(100))}
          >
            {/* doesn't blur on android
                https://docs.expo.dev/versions/latest/sdk/blur-view/ */}
            <BlurView className="h-full w-full" intensity={20}>
              <View className="h-full w-full bg-background/90" />
            </BlurView>
          </Animated.View>
        </Pressable>
        <TextClassContext.Provider value="text-popover-foreground">
          <Animated.View
            className={modalVariants({ className, variant })}
            entering={noAndroid(FadeInDown.duration(100))}
            exiting={noAndroid(FadeOutDown.duration(100))}
            style={{ borderCurve: 'continuous' }}
          >
            {isLoading && (
              <Animated.View
                className="absolute inset-0 z-10"
                exiting={noAndroid(FadeOut.duration(100))}
              >
                <Loading className="bg-popover" />
              </Animated.View>
            )}
            {children}
          </Animated.View>
        </TextClassContext.Provider>
      </KeyboardAvoidingView>
      {isSheet && (
        <Animated.View
          className="w-full bg-popover"
          entering={noAndroid(FadeIn.duration(100))}
          exiting={noAndroid(FadeOut.duration(100))}
          style={{ height: insets.bottom }}
        />
      )}
    </View>
  );
};

Modal.displayName = 'Modal';
