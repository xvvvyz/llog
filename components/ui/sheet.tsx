import { Loading } from '@/components/ui/loading';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { animation } from '@/utilities/animation';
import { cn } from '@/utilities/cn';
import { Portal } from '@rn-primitives/portal';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated';

export const Sheet = ({
  children,
  className,
  detached,
  loading,
  loadingClassName,
  onDismiss,
  open,
  portalName,
}: {
  children: React.ReactNode;
  className?: string;
  detached?: boolean;
  loading?: boolean;
  loadingClassName?: string;
  onDismiss: () => void;
  open: boolean;
  portalName: string;
}) => {
  const inset = useSafeAreaInsets();

  return (
    <Portal name={portalName}>
      <Modal
        focusable={false}
        onRequestClose={onDismiss}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={open}
      >
        <Animated.View
          className={cn(
            'absolute inset-0 justify-end',
            detached && 'justify-center'
          )}
          entering={animation(FadeInDown)}
          exiting={animation(FadeOutDown)}
        >
          <Animated.View
            className="bg-background/90 absolute inset-0"
            entering={animation(FadeIn)}
            exiting={animation(FadeOut)}
          >
            <Pressable
              className="h-full w-full cursor-default"
              onPress={onDismiss}
            />
          </Animated.View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className={cn(
              'border-border-secondary bg-popover overflow-hidden rounded-t-4xl border-x border-t',
              detached && 'rounded-4xl border',
              className
            )}
            style={{ borderCurve: 'continuous' }}
          >
            {children}
            {loading && (
              <Animated.View
                className={cn(
                  'bg-popover absolute inset-0 z-10 rounded-t-4xl',
                  detached && 'rounded-4xl',
                  loadingClassName
                )}
                exiting={animation(FadeOut)}
              >
                <Loading className="bg-popover" />
              </Animated.View>
            )}
          </KeyboardAvoidingView>
          {!detached && (
            <View
              className="border-border bg-popover border-x"
              style={{ height: inset.bottom }}
            />
          )}
        </Animated.View>
      </Modal>
    </Portal>
  );
};
