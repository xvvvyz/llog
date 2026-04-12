import { Loading } from '@/components/ui/loading';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            className="absolute inset-0 bg-background/90"
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
              'overflow-hidden rounded-t-4xl border-x border-t border-border-secondary bg-popover',
              detached && 'rounded-4xl border',
              className
            )}
            style={{ borderCurve: 'continuous' }}
          >
            {children}
            {loading && (
              <Animated.View
                className={cn(
                  'absolute inset-0 z-10 rounded-t-4xl bg-popover',
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
              className="border-x border-border bg-popover"
              style={{ height: inset.bottom }}
            />
          )}
        </Animated.View>
      </Modal>
    </Portal>
  );
};
