import { Loading } from '@/components/ui/loading';
import { animation } from '@/utilities/ui/utils';
import { Portal } from '@rn-primitives/portal';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from 'react-native-reanimated';

export const Sheet = ({
  children,
  loading,
  onDismiss,
  open,
  portalName,
}: {
  children: ReactNode;
  loading: boolean;
  onDismiss: () => void;
  open: boolean;
  portalName: string;
}) => {
  const inset = useSafeAreaInsets();

  return (
    <Portal name={portalName}>
      <Modal onRequestClose={onDismiss} transparent visible={open}>
        <GestureHandlerRootView>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end"
          >
            <Animated.View
              className="absolute inset-0 bg-background/50"
              entering={animation(FadeIn)}
              exiting={animation(FadeOut)}
            >
              <Pressable
                className="h-full w-full cursor-default"
                onPress={onDismiss}
              />
            </Animated.View>
            <Animated.View
              className="rounded-t-3xl border-x border-t border-border-secondary bg-popover"
              entering={animation(FadeInDown)}
              exiting={animation(FadeOutDown)}
              style={{ borderCurve: 'continuous' }}
            >
              {children}
              {loading && (
                <Animated.View
                  className="absolute inset-0 z-10 rounded-t-3xl bg-popover"
                  exiting={animation(FadeOut)}
                >
                  <Loading />
                </Animated.View>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
          <Animated.View
            className="border-x border-border bg-popover"
            entering={animation(FadeInDown)}
            exiting={animation(FadeOutDown)}
            style={{ height: inset.bottom }}
          />
        </GestureHandlerRootView>
      </Modal>
    </Portal>
  );
};
