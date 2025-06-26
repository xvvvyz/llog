import { Loading } from '@/components/ui/loading';
import { animation } from '@/utilities/animation';
import { cn } from '@/utilities/cn';
import { Portal } from '@rn-primitives/portal';
import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  children: ReactNode;
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
        transparent
        visible={open}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className={cn('flex-1 justify-end', detached && 'justify-center')}
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
          <Animated.View
            className={cn(
              'overflow-hidden rounded-t-4xl border-x border-t border-border-secondary bg-popover',
              detached && 'rounded-4xl border',
              className
            )}
            entering={animation(FadeInDown)}
            exiting={animation(FadeOutDown)}
            style={{ borderCurve: 'continuous' }}
          >
            <View className={cn(loading && 'pointer-events-none opacity-0')}>
              {children}
            </View>
            {loading && (
              <Animated.View
                className={cn(
                  'absolute inset-0 z-10 rounded-t-4xl bg-popover',
                  detached && 'rounded-4xl',
                  loadingClassName
                )}
                exiting={animation(FadeOut)}
              >
                <Loading />
              </Animated.View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
        {!detached && (
          <Animated.View
            className="border-x border-border bg-popover"
            entering={animation(FadeInDown)}
            exiting={animation(FadeOutDown)}
            style={{ height: inset.bottom }}
          />
        )}
      </Modal>
    </Portal>
  );
};
