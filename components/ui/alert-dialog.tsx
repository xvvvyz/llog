import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { noAndroid } from '@/utilities/no-android';
import { Portal } from '@rn-primitives/portal';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated';

const Root = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="absolute inset-0 flex-1 items-center justify-center overflow-hidden p-8"
    >
      <Pressable
        className="absolute inset-0 cursor-default"
        onPress={router.back}
      >
        <Animated.View
          className="h-full w-full bg-background/80"
          entering={noAndroid(FadeIn.duration(150))}
          exiting={noAndroid(FadeOut.duration(150))}
        />
      </Pressable>
      <TextClassContext.Provider value="text-popover-foreground">
        <Animated.View
          className={cn(
            'w-full max-w-xs cursor-default rounded-3xl bg-popover p-6',
            className
          )}
          entering={noAndroid(FadeInDown.duration(150))}
          exiting={noAndroid(FadeOutDown.duration(150))}
          style={{ borderCurve: 'continuous' }}
        >
          {children}
        </Animated.View>
      </TextClassContext.Provider>
    </KeyboardAvoidingView>
  );

  return Platform.OS === 'ios' ? (
    content
  ) : (
    <Portal name="alert-dialog">{content}</Portal>
  );
};

const Footer = ({ children }: { children: ReactNode }) => {
  return <View className="mt-8 flex-row justify-end gap-4">{children}</View>;
};

const Title = ({ children }: { children: ReactNode }) => {
  return <Text className="text-2xl">{children}</Text>;
};

export { Footer, Root, Title };
